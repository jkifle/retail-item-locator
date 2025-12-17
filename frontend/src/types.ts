// src/types.ts (FINAL, CORRECTED INTERFACES)

export type AppView = 
    'ITEM_LOOKUP' | 
    'BULK_LOCATION_IMPORT' | 
    'PRODUCT_MASTER_IMPORT';

export const AppViewName = {
    ItemLookup: 'ITEM_LOOKUP' as AppView,
    BulkLocationImport: 'BULK_LOCATION_IMPORT' as AppView,
    ProductMasterImport: 'PRODUCT_MASTER_IMPORT' as AppView,
};
// RAW PRODUCT CSV ROW (Matching EXACT CSV Headers)
export interface RawProductCSVRow {
    UPC: string;
    Item: string;
    Price: string;
    Category: string;
    Brand: string;
    "Custom SKU": string;       
    EAN: string;
    "Manufact. SKU": string;    
    "System ID": string;  
    "Subcategory 1": string;
    "Subcategory 2": string;
    "Subcategory 3": string;
}


// PRODUCT IMPORT PAYLOAD (Sent to /api/product-import)
export interface ProductPayload {
    system_id: string;
    upc: string;            
    description: string;    
    price: number;
    category: string;
    brand: string;
    custom_sku: string;     
    ean: string;            
    manufacture_sku: string;
    subcat_1: string;
    subcat_2: string;
    subcat_3: string;
}


// RAW LOCATION CSV ROW (Matching Location Import CSV Headers)
export interface RawLocationCSVRow {
    UPC: string;
    ShelfID: string;
    ShelfRow: string;
    ItemPosition: string;
}


// INVENTORY IMPORT PAYLOAD (Sent to /api/import)
export interface ImportPayload {
    upc: string;
    shelf_id: string;
    shelf_row: string;
    item_position: number;
}


// LOOKUP RESULT (Data received from /api/lookup)
export interface LookupResult {
    // Product Fields (from ProductPayload structure)
    system_id: string;
    upc_id: string;
    description: string;
    price: number;
    category: string;
    brand: string;
    custom_sku: string;
    ean: string;
    manufacture_sku: string;
    subcat_1: string;
    subcat_2: string;
    subcat_3: string;

    // Location Fields (from inventory table)
    shelf_id: string;
    shelf_row: string;
    item_position: number;
}