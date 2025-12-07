// src/components/ItemLookup.tsx
import React, { useState } from "react";
import type { KeyboardEvent } from "react"; // <-- FIX: Use 'import type' for KeyboardEvent
import type { InventoryItem } from "../src/types";

const API_LOOKUP_URL = "http://127.0.0.1:5000/api/lookup";

const ItemLookup: React.FC = () => {
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const lookupItem = async () => {
    if (!query.trim()) {
      setError("Please enter a UPC or search term.");
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch(`${API_LOOKUP_URL}?q=${query}`);
      const data = await response.json();

      if (response.ok) {
        // Cast the returned data to the expected type
        setResults(data as InventoryItem[]);
      } else {
        setError(data.error || "Unknown error during lookup.");
      }
    } catch (e) {
      setError("Connection error: Ensure the Flask server is running.");
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (_e: KeyboardEvent<HTMLInputElement>) => {
    if (_e.key === "Enter") {
      lookupItem();
    }
  };

  return (
    <div className="card">
      <h2>Item Locator</h2>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Scan UPC or type name"
        autoFocus
        aria-label="Search Query"
      />
      <button onClick={lookupItem} disabled={loading}>
        {loading ? "Searching..." : "Search"}
      </button>

      {error && <p className="error-message error">{error}</p>}

      {results.length > 0 ? (
        <div className="results-container">
          <h3>{results.length} result(s) found:</h3>
          {results.map((item) => (
            <div key={item.upc_id} className="result-card">
              <strong>{item.item_name}</strong> (UPC: {item.upc_id})
              <div className="location">
                {item.shelf_id} / {item.shelf_row} / POS {item.item_position}
              </div>
            </div>
          ))}
        </div>
      ) : (
        !loading &&
        query.trim() &&
        !error && (
          <p className="no-results status-message info">No item found.</p>
        )
      )}
    </div>
  );
};

export default ItemLookup;
