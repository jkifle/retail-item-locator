import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./ui/table";
import { Badge } from "./ui/badge";
import { settingsRequest } from "../services/settings";
import { invalidateSessionCache } from "../services/sessionCache";
import type { CompanyUser } from "../services/settings";

const roles = [
  { name: "admin", description: "Manage stores and view company users; import and search items." },
  { name: "staff", description: "Import products, assign store locations, and search items." },
  { name: "viewer", description: "Search items and view store locations." },
];

export function AdminRolePage() {
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    settingsRequest<{ users: CompanyUser[] }>("/api/users")
      .then((data) => { if (!cancelled) { setUsers(data.users); setError(""); } })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load users"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reload]);
  const filtered = users.filter((user) => `${user.display_name || ""} ${user.email || ""} ${user.role}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-6">
    <h1>Users &amp; Roles</h1>
    <Card>
      <CardHeader><CardTitle>Users</CardTitle><CardDescription>Accounts provisioned for your company.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3"><Input aria-label="Search users" placeholder="Search users" value={query} onChange={(event) => setQuery(event.target.value)} /><Button variant="outline" disabled={loading} onClick={() => { invalidateSessionCache("/api/users"); setLoading(true); setReload((value) => value + 1); }}>Refresh</Button></div>
        {error && <p role="alert" className="text-destructive">{error}</p>}
        <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>{filtered.map((user) => <TableRow key={user.user_id}><TableCell>{user.display_name || "Name not set"}</TableCell><TableCell>{user.email || "Email not set"}</TableCell><TableCell><Badge variant="outline">{user.role}</Badge></TableCell><TableCell>{user.is_active ? "Active" : "Inactive"}</TableCell></TableRow>)}
          {!filtered.length && <TableRow><TableCell colSpan={4} className="text-center">{loading ? "Loading users..." : error ? "Users unavailable" : users.length ? "No matching users" : "No users have been provisioned for this company."}</TableCell></TableRow>}</TableBody>
        </Table>
      </CardContent>
    </Card>
    <Card><CardHeader><CardTitle>Roles</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">{roles.map((role) => <div key={role.name}><h3 className="capitalize">{role.name}</h3><p className="text-muted-foreground">{role.description}</p><p>{users.filter((user) => user.role === role.name).length} users</p></div>)}</CardContent></Card>
  </div>;
}
