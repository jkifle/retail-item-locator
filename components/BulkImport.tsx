// src/components/BulkImport.tsx
import React, { useState, useRef } from "react";
import type { KeyboardEvent, ChangeEvent } from "react";
import type { ImportPayload, RawLocationCSVRow } from "../src/types";
import Papa from "papaparse";

const API_IMPORT_URL = "/api/import";

// Define the available modes
type ImportMode = "scan" | "file" | "paste";

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
  // Location state
  const [shelfId, setShelfId] = useState<string>("");
  const [shelfRow, setShelfRow] = useState<string>("");
  const [position, setPosition] = useState<number>(1);

  // Scan/Bulk state
  const [upc, setUpc] = useState<string>("");
  const [mode, setMode] = useState<ImportMode>("scan");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [pastedData, setPastedData] = useState<string>("");

  // UI/Status state
  const [status, setStatus] = useState<{
    message: string;
    type: "info" | "loading" | "success" | "conflict" | "error";
  }>({ message: "Ready to scan.", type: "info" });
  const [loading, setLoading] = useState<boolean>(false);

  const upcInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
      setStatus({
        message: `Bulk file selected: ${e.target.files[0].name}`,
        type: "info",
      });
    }
  };

  /**
   * Handles the unified API submission for all modes (single, file, paste).
   * @param payloads An array of ImportPayload objects to be assigned locations.
   */
  const processLocations = async (payloads: ImportPayload[]) => {
    if (payloads.length === 0) {
      setLoading(false);
      return setStatus({
        message: "Error: No valid codes found to import.",
        type: "error",
      });
    }

    setLoading(true);
    setStatus({
      message: `Sending ${payloads.length} locations to server...`,
      type: "loading",
    });

    try {
      const response = await fetch(API_IMPORT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloads),
      });

      const data = await response.json();

      if (response.ok) {
        // Determine the next starting position after the import
        const newStartingPosition = position + payloads.length;
        setStatus({
          message: `Success! Assigned ${payloads.length} items starting at POS ${position}. Next scan/start: ${newStartingPosition}`,
          type: "success",
        });

        setPosition(newStartingPosition);
        setUpc("");
        setImportFile(null);
        setPastedData("");
        if (mode === "scan" && upcInputRef.current) upcInputRef.current.focus();
      } else {
        // Show specific error if product data is missing (404 from Flask)
        if (response.status === 404) {
          setStatus({
            message: `Server Error (404): ${
              data.message || "Product data not found for one or more codes."
            }`,
            type: "error",
          });
        } else {
          setStatus({
            message: `Server Error: ${data.message || "Check server logs."}`,
            type: "error",
          });
        }
      }
    } catch (e) {
      setStatus({
        message: "Connection Error: Ensure Flask server is running.",
        type: "error",
      });
      console.error("Error Details:", e);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Parses the CSV file and constructs the sequential location payloads.
   */
  const handleFileImport = () => {
    if (!importFile) {
      setStatus({ message: "Error: Please select a CSV file.", type: "error" });
      return;
    }
    if (!shelfId || !shelfRow) {
      setStatus({
        message: "Error: Location details must be set.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    Papa.parse(importFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawData: RawLocationCSVRow[] =
          results.data as RawLocationCSVRow[];
        let currentPosition = position;

        // Build the list of payloads sequentially
        const bulkPayloads: ImportPayload[] = rawData
          .map((row) => {
            const currentUPC = String(row.UPC || "").trim();
            if (currentUPC.length > 0) {
              const payload: ImportPayload = {
                upc: currentUPC,
                shelf_id: shelfId,
                shelf_row: shelfRow,
                item_position: currentPosition,
              };
              currentPosition++; // Increment position for the next item
              return payload;
            }
            return null;
          })
          .filter((p): p is ImportPayload => p !== null);

        processLocations(bulkPayloads);
      },
      error: (err) => {
        setLoading(false);
        setStatus({ message: `Parsing Failed: ${err.message}`, type: "error" });
      },
    });
  };

  /**
   * Parses the pasted text data (robustly handles newlines, commas, and spaces).
   */
  const handlePasteImport = () => {
    if (!pastedData.trim()) {
      setStatus({ message: "Error: Paste area is empty.", type: "error" });
      return;
    }
    if (!shelfId || !shelfRow) {
      setStatus({
        message: "Error: Location details must be set.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    setStatus({ message: `Parsing pasted data...`, type: "loading" });

    // 1. Use a single powerful regex to replace all common delimiters (newlines, commas, tabs, and spaces)
    //    with a single space character.
    const upcList = pastedData
      .replace(/[\n, \t]+/g, " ")
      .trim()
      .split(" ")
      .filter((upc) => upc.length > 0);

    if (upcList.length === 0) {
      setLoading(false);
      return setStatus({
        message: "Error: No valid codes found in the pasted data.",
        type: "error",
      });
    }

    let currentPosition = position;

    const bulkPayloads: ImportPayload[] = upcList.map((upc) => {
      const payload: ImportPayload = {
        upc: upc,
        shelf_id: shelfId,
        shelf_row: shelfRow,
        item_position: currentPosition,
      };
      currentPosition++;
      return payload;
    });

    processLocations(bulkPayloads);
  };

  /**
   * Handles the single item scan.
   */
  const handleSingleScan = () => {
    if (!upc) {
      return;
    }
    if (!shelfId || !shelfRow || position < 1) {
      setStatus({
        message: "Error: Location details must be set.",
        type: "error",
      });
      return;
    }

    const payload: ImportPayload = {
      upc,
      shelf_id: shelfId,
      shelf_row: shelfRow,
      item_position: position,
    };

    processLocations([payload]);
  };

  const handleKeyPress = (_e: KeyboardEvent<HTMLInputElement>) => {
    if (_e.key === "Enter" && mode === "scan") {
      _e.preventDefault();
      handleSingleScan();
    }
  };

  // --- UI Structure ---
  return (
    <div className="card">
      <h2>Inventory Scan / Location Assignment</h2>

      {/* Location Inputs (Always visible) */}
      <div className="input-group">
        <label htmlFor="shelf-id">Target Shelf ID</label>
        <input
          id="shelf-id"
          type="text"
          value={shelfId}
          onChange={(e) => setShelfId(e.target.value)}
          placeholder="Aisle 3"
          disabled={loading}
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
          disabled={loading}
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
          disabled={loading}
        />
      </div>

      <hr />

      {/* Mode Toggle */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "10px" }}>
        <button
          onClick={() => setMode("scan")}
          className={mode === "scan" ? "active" : ""}
          disabled={loading}
        >
          Single Scan
        </button>
        <button
          onClick={() => setMode("file")}
          className={mode === "file" ? "active" : ""}
          disabled={loading}
        >
          CSV File Import
        </button>
        <button
          onClick={() => setMode("paste")}
          className={mode === "paste" ? "active" : ""}
          disabled={loading}
        >
          Paste List
        </button>
      </div>

      {/* Conditional Input Section */}
      {mode === "scan" && (
        // --- Single Scan Mode ---
        <div className="input-group">
          <label htmlFor="upc-input">Code (Scan Here)</label>
          <input
            id="upc-input"
            ref={upcInputRef}
            type="text"
            value={upc}
            onChange={(e) => setUpc(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Scan UPC, SKU, or EAN"
            autoFocus
            disabled={loading}
          />
          <button
            onClick={handleSingleScan}
            disabled={loading || !upc}
            style={{ marginTop: "10px" }}
          >
            {loading ? "Processing..." : "Assign Location"}
          </button>
        </div>
      )}

      {mode === "file" && (
        // --- Bulk File Import Mode ---
        <div className="input-group">
          <label htmlFor="bulk-file">CSV File (Code list)</label>
          <p
            style={{
              color: "var(--color-text-muted)",
              fontSize: "0.85rem",
              marginTop: "-5px",
            }}
          >
            CSV must have a header named **UPC** (containing the product code).
          </p>
          <input
            id="bulk-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={loading}
          />
          <button
            onClick={handleFileImport}
            disabled={loading || !importFile}
            style={{ marginTop: "10px" }}
          >
            {loading
              ? "Processing..."
              : `Start File Import (${position} onwards)`}
          </button>
        </div>
      )}

      {mode === "paste" && (
        // --- Paste List Mode ---
        <div className="input-group">
          <label htmlFor="paste-data">Paste Codes Here</label>
          <p
            style={{
              color: "var(--color-text-muted)",
              fontSize: "0.85rem",
              marginTop: "-5px",
            }}
          >
            Enter codes separated by newlines, commas, or spaces.
          </p>
          <textarea
            id="paste-data"
            rows={6}
            value={pastedData}
            onChange={(e) => setPastedData(e.target.value)}
            placeholder="e.g., 1234567890&#10;1234567891&#10;1234567892"
            disabled={loading}
            style={{ resize: "vertical" }}
          />
          <button
            onClick={handlePasteImport}
            disabled={loading || !pastedData.trim()}
            style={{ marginTop: "10px" }}
          >
            {loading
              ? "Processing..."
              : `Start Paste Import (${position} onwards)`}
          </button>
        </div>
      )}

      <p className={getStatusClasses(status.type)}>
        {loading ? "Processing..." : status.message}
      </p>
    </div>
  );
};

export default BulkImport;
