// src/types.ts (Refactored Interfaces)

// Existing interface for a single product payload sent to /api/product-import
export interface ProductPayload {
    upc: string;
    description: string;
    price: number;
    category: string;
    brand: string;
    custom_sku: string;        // Existing
    ean: string;               // NEW
    manufacture_sku: string;   // NEW
}

// Interface matching the raw CSV headers for Product Import
// Ensure your CSV has headers exactly matching these keys
export interface RawProductCSVRow {
    UPC: string;
    Item: string;
    Price: string;
    Category: string;
    Brand: string;
    "Custom SKU": string;
    EAN: string;
    "Manufact. SKU": string;
    "System ID": string;  // Retained for backward compatibility
}

// The following types remain the same:

// Interface matching the raw CSV headers for Bulk Location Import
export interface RawLocationCSVRow {
    UPC: string;
}

// Interface for location assignment (used by BulkImport.tsx and sent to /api/import)
export interface ImportPayload {
  upc: string;
  description: string; 
  shelf_id: string;
  shelf_row: string;
  item_position: number;
}