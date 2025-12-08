// src/components/BulkImport.tsx
import React, { useState, useRef } from "react";
import type { KeyboardEvent } from "react";
import type { ImportPayload } from "../src/types";

const API_IMPORT_URL = "http://127.0.0.1:5000/api/import";

const getStatusClasses = (
  type: "info" | "loading" | "success" | "conflict" | "error"
) => {
  switch (type) {
    case "success":
      return "status-message success";
    case "error":
      return "status-message error";
    case "conflict":
      return "status-message conflict";
    default:
      return "status-message info";
  }
};

const BulkImport: React.FC = () => {
  const [shelfId, setShelfId] = useState<string>("");
  const [shelfRow, setShelfRow] = useState<string>("");
  const [position, setPosition] = useState<number>(1);
  const [upc, setUpc] = useState<string>("");
  // REMOVED: const [name, setName] = useState<string>('');
  const [status, setStatus] = useState<{
    message: string;
    type: "info" | "loading" | "success" | "conflict" | "error";
  }>({ message: "Ready to scan.", type: "info" });
  const [loading, setLoading] = useState<boolean>(false);

  const upcInputRef = useRef<HTMLInputElement>(null);

  const importItem = async () => {
    // Validation now only checks required location fields + UPC
    if (!upc || !shelfId || !shelfRow || position < 1) {
      setStatus({
        message: "Error: UPC, Shelf ID, Row, and Position must be set.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    setStatus({ message: `Processing UPC ${upc}...`, type: "loading" });

    const payload: ImportPayload = {
      upc,
      // The 'name' field is no longer strictly necessary for the backend
      // but we must send something if the ImportPayload type requires it.
      // Since the backend doesn't use it, we'll send a dummy value:
      shelf_id: shelfId,
      shelf_row: shelfRow,
      item_position: position,
    };
    // NOTE: You may need to update src/types.ts to remove 'name' from ImportPayload
    // for full type safety, but the current fix works functionally.

    try {
      const response = await fetch(API_IMPORT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      // ... (rest of the API call logic)
      const data = await response.json();

      if (response.ok) {
        const nextPosition = position + 1;
        setStatus({
          message: `Success! UPC ${upc} assigned to POS ${position}. Next: ${nextPosition}`,
          type: "success",
        });

        setPosition(nextPosition);
        setUpc("");
        if (upcInputRef.current) upcInputRef.current.focus();
      } else if (response.status === 409) {
        setStatus({
          message: `Conflict! Position ${position} is taken. Change position or location.`,
          type: "conflict",
        });
        if (upcInputRef.current) upcInputRef.current.focus();
      } else if (response.status === 404) {
        // Foreign Key check failed in Flask (UPC not in products table)
        setStatus({
          message: `UPC ${upc} not found in Product Data. Sync first!`,
          type: "conflict",
        });
      } else {
        setStatus({
          message: `Server Error: ${data.error || "Check server logs."}`,
          type: "error",
        });
      }
    } catch (e) {
      setStatus({
        message: "Connection Error: Ensure Flask server is running.",
        type: "error",
      });
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (_e: KeyboardEvent<HTMLInputElement>) => {
    if (_e.key === "Enter") {
      _e.preventDefault();
      importItem();
    }
  };

  return (
    <div className="card">
      <h2>Inventory Scan / Location Assignment</h2>

      <div className="input-group">
        <label htmlFor="shelf-id">Target Shelf ID</label>
        <input
          id="shelf-id"
          type="text"
          value={shelfId}
          onChange={(e) => setShelfId(e.target.value)}
          placeholder="Aisle 3"
        />
      </div>

      <div className="input-group">
        <label htmlFor="shelf-row">Target Shelf Row</label>
        <input
          id="shelf-row"
          type="text"
          value={shelfRow}
          onChange={(e) => setShelfRow(e.target.value)}
          placeholder="TOP, MIDDLE, or LOW"
        />
      </div>

      <div className="input-group">
        <label htmlFor="current-position">Starting Position</label>
        <input
          id="current-position"
          type="number"
          value={position}
          onChange={(e) => setPosition(parseInt(e.target.value) || 1)}
          min="1"
        />
      </div>

      <hr />

      <h3>Scan Item:</h3>
      <div className="input-group">
        <label htmlFor="upc-input">UPC (Scan Here)</label>
        <input
          id="upc-input"
          ref={upcInputRef}
          type="text"
          value={upc}
          onChange={(e) => setUpc(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Scan UPC"
          autoFocus
        />
      </div>

      <p className={getStatusClasses(status.type)}>
        {loading ? "Processing..." : status.message}
      </p>
    </div>
  );
};

export default BulkImport;
