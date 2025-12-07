// src/types.ts
// Defines the possible states for the main App component
export type AppView = 'lookup' | 'import';

// Defines the structure of an item returned by the /api/lookup endpoint
export type InventoryItem = {
  upc_id: string;
  item_name: string;
  shelf_id: string;
  shelf_row: string;
  item_position: number;
};

// Defines the structure for the POST body sent to the /api/import endpoint
export type ImportPayload = {
  upc: string;
  name: string;
  shelf_id: string;
  shelf_row: string;
  item_position: number;
};