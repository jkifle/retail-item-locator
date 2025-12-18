// src/components/ItemLookup.tsx
import React, { useState } from "react";
import type { KeyboardEvent } from "react";
import type { LookupResult } from "../types";

export const API_LOOKUP_URL =
  "https://retail-item-locator-api.onrender.com/api/lookup";

const ItemLookup: React.FC = () => {
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<LookupResult[]>([]);
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
        // Cast the returned data to the correct type
        setResults(data as LookupResult[]);
      } else {
        // If the API returns a standard error object
        setError(data.message || data.error || "Unknown error during lookup.");
      }
    } catch (e) {
      setError("Connection error: Ensure the Flask server is running.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
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
          {results.map((item, index) => (
            // CRITICAL FIX: Use system_id + index for a unique key if system_id repeats
            <div key={`${item.system_id}-${index}`} className="result-card">
              {/* CRITICAL FIX: Use 'description' instead of 'item_name' */}
              <strong>{item.description}</strong> (UPC: {item.upc_id})
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
