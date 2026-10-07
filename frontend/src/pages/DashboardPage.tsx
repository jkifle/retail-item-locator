import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Edit2,
  Eye,
} from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import type { KeyboardEvent } from "react";
import type { LookupResult } from "../types";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import { loadStores } from "../services/settings";
import type { Store } from "../services/settings";

type SortKey =
  | "upc_id"
  | "description"
  | "category"
  | "shelf_id"
  | "shelf_row"
  | "item_position";

type SortOrder = "asc" | "desc";

export function DashboardPage() {
  const navigate = useNavigate();

  /* ------------------ API State ------------------ */
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LookupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ------------------ UI State ------------------ */
  const [storeFilter, setStoreFilter] = useState("all");
  const [stores, setStores] = useState<Store[]>([]);
  useEffect(() => {
    let cancelled = false;
    loadStores().then(({ stores }) => { if (!cancelled) setStores(stores); })
      .catch((error) => { if (!cancelled) setError(error instanceof Error ? error.message : "Unable to load stores"); });
    return () => { cancelled = true; };
  }, []);
  const [sortKey, setSortKey] = useState<SortKey>("upc_id");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 8;

  /* ------------------ API Lookup ------------------ */
  const lookupItem = async () => {
    if (loading) return;
    if (!query.trim()) {
      setError("Please enter a UPC or search term.");
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/lookup?q=${encodeURIComponent(query.trim())}`);

      const data = await response.json();

      if (response.ok) {
        // Double-check your backend success envelope structure (e.g., data.data.items vs data)
        setResults(data.data?.items || (data as LookupResult[]));
      } else {
        // Adjust based on your backend error payload key (e.g., data.error vs data.message)
        setError(data.message || data.error || "Lookup failed.");
      }
    } catch (err) {
      setError("Connection error: API unavailable - " + err);
    } finally {
      setLoading(false);
    }
};

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") lookupItem();
  };

  /* ------------------ Sorting ------------------ */
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  /* ------------------ Data Pipeline ------------------ */
  const processedResults = useMemo(() => {
    let data = [...results];

    if (storeFilter !== "all") {
      data = data.filter((item) => item.store_id === storeFilter);
    }

    data.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [results, storeFilter, sortKey, sortOrder]);

  /* ------------------ Pagination ------------------ */
  const totalPages = Math.ceil(processedResults.length / itemsPerPage);

  const paginatedItems = processedResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [results, storeFilter]);

  /* ------------------ Sort Icon ------------------ */
  const SortIcon = ({ column }: { column: SortKey }) =>
    sortKey === column ? (
      sortOrder === "asc" ? (
        <ChevronUp className="inline w-4 h-4 ml-1" />
      ) : (
        <ChevronDown className="inline w-4 h-4 ml-1" />
      )
    ) : null;

  /* ------------------ Render ------------------ */
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1>Item Lookup</h1>
        <p className="text-muted-foreground">
          Search and manage retail item locations
        </p>
      </div>

      {/* Search / Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={loading ? "Searching..." : "Search by UPC or description..."}
            disabled={loading}
            className="pl-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyPress}
          />
        </div>

        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by store" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stores</SelectItem>
            {stores.map((store) => <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-destructive">{error}</p>}

      {/* Table */}
      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                onClick={() => handleSort("upc_id")}
                className="cursor-pointer"
              >
                UPC <SortIcon column="upc_id" />
              </TableHead>
              <TableHead
                onClick={() => handleSort("description")}
                className="cursor-pointer"
              >
                Description <SortIcon column="description" />
              </TableHead>
              <TableHead
                onClick={() => handleSort("category")}
                className="cursor-pointer"
              >
                Category <SortIcon column="category" />
              </TableHead>
              <TableHead
                onClick={() => handleSort("shelf_id")}
                className="cursor-pointer"
              >
                Shelf ID <SortIcon column="shelf_id" />
              </TableHead>
              <TableHead
                onClick={() => handleSort("shelf_row")}
                className="cursor-pointer"
              >
                Shelf Row <SortIcon column="shelf_row" />
              </TableHead>
              <TableHead
                onClick={() => handleSort("item_position")}
                className="cursor-pointer"
              >
                Position <SortIcon column="item_position" />
              </TableHead>
              <TableHead>Store</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedItems.length ? (
              paginatedItems.map((item) => (
                <TableRow key={item.inventory_id || item.system_id}>
                  <TableCell className="font-mono">{item.upc_id}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.category}</Badge>
                  </TableCell>
                  <TableCell>{item.shelf_id}</TableCell>
                  <TableCell>{item.shelf_row}</TableCell>
                  <TableCell>{item.item_position}</TableCell>
                  <TableCell>{item.store_name || "No location assigned"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/items")}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/items")}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  No results found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1}–
            {Math.min(currentPage * itemsPerPage, processedResults.length)} of{" "}
            {processedResults.length}
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>

            {Array.from({ length: totalPages }).map((_, i) => (
              <Button
                key={i}
                size="sm"
                variant={currentPage === i + 1 ? "default" : "outline"}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
