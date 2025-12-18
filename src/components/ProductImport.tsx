// src/components/ProductImport.tsx
import React, { useState } from "react";
import type { ChangeEvent } from "react";
import type { RawProductCSVRow, ProductPayload } from "../types";
import Papa from "papaparse";

const API_IMPORT_URL = "/api/product-import";

// Helper function to dynamically apply CSS classes for status messages
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

const ProductImport: React.FC = () => {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{
    message: string;
    type: "info" | "loading" | "success" | "conflict" | "error";
  }>({ message: "Ready to import product master file.", type: "info" });
  const [loading, setLoading] = useState<boolean>(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
      setStatus({
        message: `File selected: ${e.target.files[0].name}`,
        type: "info",
      });
    }
  };

  const handleImport = () => {
    if (!importFile) {
      setStatus({ message: "Error: Please select a CSV file.", type: "error" });
      return;
    }

    setLoading(true);
    setStatus({ message: `Parsing ${importFile.name}...`, type: "loading" });

    Papa.parse(importFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rawData: RawProductCSVRow[] = results.data as RawProductCSVRow[];

        const productPayloads: ProductPayload[] = rawData
          .map((row) => {
            // Crucial: Check for the primary key (UPC)
            const upc = String(row.UPC || "").trim();
            if (upc.length === 0) {
              console.warn("Skipping row with missing UPC:", row);
              return null;
            }

            // Map and clean all fields, including the new EAN and Manufacturer SKU
            return {
              upc: upc,
              description: String(row.Item || "").trim(),
              // Robust price parsing: remove non-numeric chars except '.' and parse as float
              price:
                parseFloat(String(row.Price || "0").replace(/[^0-9.]/g, "")) ||
                0.0,
              category: String(row.Category || "").trim(),
              brand: String(row.Brand || "").trim(),
              custom_sku: String(row["Custom SKU"] || "").trim(),
              ean: String(row.EAN || "").trim(),
              manufacture_sku: String(row["Manufact. SKU"] || "").trim(),
              system_id: String(row["System ID"] || "").trim(),
            } as ProductPayload;
          })
          .filter((p): p is ProductPayload => p !== null);

        if (productPayloads.length === 0) {
          setLoading(false);
          return setStatus({
            message: "Error: No valid product records found to import.",
            type: "error",
          });
        }

        // --- API Submission ---
        try {
          const response = await fetch(API_IMPORT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(productPayloads),
          });

          const data = await response.json();

          if (response.ok) {
            setStatus({
              message: `Success! Imported/updated ${productPayloads.length} product records.`,
              type: "success",
            });
            setImportFile(null); // Clear file input on success
          } else {
            // The server response should contain a detailed message on failure
            setStatus({
              message: `Server Error: ${data.message || "Check server logs."}`,
              type: "error",
            });
          }
        } catch (e) {
          setStatus({
            message:
              "Connection Error: Ensure Flask server is running and accessible.",
            type: "error",
          });
          console.error("Import Error:", e);
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        setLoading(false);
        setStatus({ message: `Parsing Failed: ${err.message}`, type: "error" });
      },
    });
  };

  return (
    <div className="card">
      <h2>Product Data Master Sync</h2>
      <p>
        Upload a CSV file to update the master list of products. This uses the
        UPC as the primary key.
      </p>

      <div className="input-group">
        <label htmlFor="product-file">Product Master CSV File</label>
        <p
          style={{
            color: "var(--color-text-muted)",
            fontSize: "0.85rem",
            marginTop: "-5px",
          }}
        >
          CSV must contain the following headers: **UPC, Name, Price, Category,
          Brand, CustomSKU, EAN, ManufacturerSKU**.
        </p>
        <input
          id="product-file"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={loading}
        />
      </div>

      <button
        onClick={handleImport}
        disabled={loading || !importFile}
        style={{ marginTop: "15px" }}
      >
        {loading
          ? "Processing..."
          : `Start Product Import (${
              importFile ? importFile.name : "No File Selected"
            })`}
      </button>

      <p className={getStatusClasses(status.type)}>
        {loading ? "Processing..." : status.message}
      </p>
    </div>
  );
};

export default ProductImport;
