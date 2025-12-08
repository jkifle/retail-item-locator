// src/types.ts
// Defines the possible states for the main App component
export type AppView = 'lookup' | 'inventory_import' | 'product_import';
// Defines the structure of an item returned by the /api/lookup endpoint
export type InventoryItem = {
  upc_id: string;
  item_name: string;
  shelf_id: string;
  shelf_row: string;
  item_position: number;
  description: string;
  price: number;
  category: string;
  brand: string;
};

// Defines the structure for the POST body sent to the /api/import endpoint
export type ImportPayload = {
  upc: string;
  shelf_id: string;
  shelf_row: string;
  item_position: number;
};

export type ProductImportPayloadItem = {
    upc: string; // Corresponds to upc_id in DB
    custom_sku: string;
    item: string; // Corresponds to item_name in DB
    price: number;
    category: string;
    subcat_1: string;
    subcat_2?: string; 
    subcat_3?: string; 
    brand: string;
};

// src/types.ts (Add this new interface)

// Interface matching the raw CSV headers after parsing (PapaParse output)
export interface RawProductCSVRow {
    UPC: string;
    'Custom SKU': string; // Matches 'custom sku' header
    Item: string;
    Price: string; // Price usually comes as a string from CSV
    Category: string;
    'Subcategory 1': string;
    'Subcategory 2': string;
    'Subcategory 3': string;
    Brand: string;
}