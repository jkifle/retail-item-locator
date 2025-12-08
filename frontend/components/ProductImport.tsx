// src/components/ProductImport.tsx
import React, { useState } from "react";
import type { ChangeEvent } from "react";
import type { ProductImportPayloadItem, RawProductCSVRow } from "../src/types";
import Papa from "papaparse";

const API_PRODUCT_IMPORT_URL = "http://127.0.0.1:5000/api/product-import";

// Helper function to dynamically set status classes for CSS
const getStatusClasses = (
  type: "info" | "success" | "error" | "loading"
): string => {
  if (type === "success") return "status-message success";
  if (type === "error") return "status-message error";
  return "status-message info";
};

const ProductImport: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<{
    message: string;
    type: "info" | "success" | "error" | "loading";
  }>({ message: "Ready to upload CSV file.", type: "info" });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setStatus({
        message: `File selected: ${e.target.files[0].name}`,
        type: "info",
      });
    }
  };

  const parseAndImport = async () => {
    if (!file) {
      setStatus({
        message: "Please select a CSV file to upload.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    setStatus({ message: `Parsing file: ${file.name}...`, type: "loading" });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true, // Helps remove trailing blank rows
      complete: async (results) => {
        // Assert the type of the parsed data for strict compliance
        const rawData: RawProductCSVRow[] = results.data as RawProductCSVRow[];

        // --- Data Transformation & Validation ---
        const productsArray: ProductImportPayloadItem[] = rawData
          .map((row) => ({
            upc: String(row.UPC || "").trim(),
            custom_sku: row["Custom SKU"] || "",
            item: row.Item || "",
            price: parseFloat(row.Price) || 0.0, // Convert string price to number
            category: row.Category || "",
            subcat_1: row["Subcategory 1"] || "",
            subcat_2: row["Subcategory 2"] || "",
            subcat_3: row["Subcategory 3"] || "",
            brand: row.Brand || "",
          }))
          .filter((item) => item.upc.length > 0 && item.upc !== "");

        if (productsArray.length === 0) {
          setLoading(false);
          return setStatus({
            message:
              "Parsing Error: No valid products found in the file. Check your UPC column.",
            type: "error",
          });
        }

        setStatus({
          message: `Sending ${productsArray.length} records to server...`,
          type: "loading",
        });
        try {
          const response = await fetch(API_PRODUCT_IMPORT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(productsArray),
          });

          const data = await response.json();

          if (response.ok) {
            setStatus({ message: `Success! ${data.message}`, type: "success" });
            setFile(null);
          } else {
            setStatus({
              message: `API Error (${response.status}): ${
                data.message || "Check Flask logs."
              }`,
              type: "error",
            });
          }
        } catch (e) {
          setStatus({
            message: `Network Error: Failed to connect to Flask API.`,
            type: "error",
          });
          console.error("Error details:", e);
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
      <h2>Bulk Product Data Import (POS Sync)</h2>
      <p>
        Upload a **CSV file** exported from your POS system. Headers must match
        the required fields exactly.
      </p>

      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        disabled={loading}
        style={{ marginBottom: "15px" }}
      />

      <button
        onClick={parseAndImport}
        disabled={loading || !file}
        style={{ padding: "10px 20px" }}
      >
        {loading
          ? "Processing..."
          : `Upload & Sync ${file ? `(${file.name})` : ""}`}
      </button>

      {/* Display status message using dynamic class */}
      {status.message && (
        <p
          className={getStatusClasses(status.type)}
          style={{ marginTop: "15px" }}
        >
          {status.message}
        </p>
      )}
    </div>
  );
};

export default ProductImport;
