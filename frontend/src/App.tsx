// src/App.tsx
import React, { useState } from "react";
import type { AppView } from "./types";
import ItemLookup from "../components/ItemLookup";
import BulkImport from "../components/BulkImport";
import ProductImport from "../components/ProductImport";
import "./App.css";

const App: React.FC = () => {
  // Sets the default view to 'lookup'. Uses the imported AppView type.
  const [currentView, setCurrentView] = useState<AppView>("lookup");

  const renderView = () => {
    switch (currentView) {
      case "lookup":
        return <ItemLookup />;
      case "inventory_import": // Inventory location scanning (UPC, Shelf ID, Position)
        return <BulkImport />;
      case "product_import": // Static product data sync (Price, Category, SKU)
        return <ProductImport />;
      default:
        return <ItemLookup />;
    }
  };

  return (
    <div className="container">
      <header className="header">
        {/* Navigation Buttons: Use the AppView strings to manage state */}
        <button
          onClick={() => setCurrentView("lookup")}
          disabled={currentView === "lookup"}
          className={currentView === "lookup" ? "active" : ""}
        >
          Item Locator
        </button>
        <button
          onClick={() => setCurrentView("inventory_import")}
          disabled={currentView === "inventory_import"}
          className={currentView === "inventory_import" ? "active" : ""}
        >
          Inventory Scan
        </button>
        <button
          onClick={() => setCurrentView("product_import")}
          disabled={currentView === "product_import"}
          className={currentView === "product_import" ? "active" : ""}
        >
          Product Sync
        </button>
      </header>

      {/* Renders the selected component */}
      <main className="main-content">{renderView()}</main>
    </div>
  );
};

export default App;
