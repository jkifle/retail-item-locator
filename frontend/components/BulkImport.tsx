// src/components/BulkImport.tsx
import React, { useState, useRef } from "react";
import type { KeyboardEvent } from "react"; // <-- FIX: Use 'import type' for KeyboardEvent
import type { ImportPayload } from "../src/types";

const API_IMPORT_URL = "http://127.0.0.1:5000/api/import";

// Helper function to dynamically set status classes
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
  const [name, setName] = useState<string>("");
  const [status, setStatus] = useState<{
    message: string;
    type: "info" | "loading" | "success" | "conflict" | "error";
  }>({ message: "Ready to scan.", type: "info" });
  const [loading, setLoading] = useState<boolean>(false);

  // Reference to the UPC input for auto-focusing after a scan
  const upcInputRef = useRef<HTMLInputElement>(null);

  const importItem = async () => {
    if (!upc || !name || !shelfId || !shelfRow || position < 1) {
      setStatus({
        message: "Error: All fields must be filled.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    setStatus({ message: `Processing UPC ${upc}...`, type: "loading" });

    const payload: ImportPayload = {
      upc,
      name,
      shelf_id: shelfId,
      shelf_row: shelfRow,
      item_position: position,
    };

    try {
      const response = await fetch(API_IMPORT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        // Success: Increment position and clear UPC field
        const nextPosition = position + 1;
        setStatus({
          message: `Success! UPC ${upc} assigned to POS ${position}. Next: ${nextPosition}`,
          type: "success",
        });

        setPosition(nextPosition);
        setUpc("");
        if (upcInputRef.current) upcInputRef.current.focus();
      } else if (response.status === 409) {
        // Location Conflict (409 from Flask backend)
        setStatus({
          message: `Conflict! Position ${position} is taken. Change position or location.`,
          type: "conflict",
        });
        if (upcInputRef.current) upcInputRef.current.focus();
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
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (_e: KeyboardEvent<HTMLInputElement>) => {
    if (_e.key === "Enter") {
      _e.preventDefault(); // You *do* use this part for form submission!
      importItem();
    }
  };

  return (
    <div className="card">
      <h2>Bulk Import / Relocation</h2>

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

      <div className="input-group">
        <label htmlFor="item-name">Item Name</label>
        <input
          id="item-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Item Name (Required for new items)"
        />
      </div>

      <p className={getStatusClasses(status.type)}>
        {loading ? "Processing..." : status.message}
      </p>
    </div>
  );
};

export default BulkImport;
