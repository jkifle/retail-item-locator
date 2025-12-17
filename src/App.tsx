import React, { useState } from "react";
import type { AppView } from "./types";
import ItemLookup from "../components/ItemLookup";
import BulkImport from "../components/BulkImport";
import ProductImport from "../components/ProductImport";
import "./App.css";

const App: React.FC = () => {
  // Sets the default view to 'lookup'. Uses the imported AppView type.
  const [currentView, setCurrentView] = useState<AppView>("ITEM_LOOKUP");

  const renderView = () => {
    switch (currentView) {
      case "ITEM_LOOKUP":
        return <ItemLookup />;
      case "BULK_LOCATION_IMPORT": // Inventory location scanning (UPC, Shelf ID, Position)
        return <BulkImport />;
      case "PRODUCT_MASTER_IMPORT": // Static product data sync (Price, Category, SKU)
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
          onClick={() => setCurrentView("ITEM_LOOKUP")}
          disabled={currentView === "ITEM_LOOKUP"}
          className={currentView === "ITEM_LOOKUP" ? "active" : ""}
        >
          Item Locator
        </button>
        <button
          onClick={() => setCurrentView("BULK_LOCATION_IMPORT")}
          disabled={currentView === "BULK_LOCATION_IMPORT"}
          className={currentView === "BULK_LOCATION_IMPORT" ? "active" : ""}
        >
          Inventory Scan
        </button>
        <button
          onClick={() => setCurrentView("PRODUCT_MASTER_IMPORT")}
          disabled={currentView === "PRODUCT_MASTER_IMPORT"}
          className={currentView === "PRODUCT_MASTER_IMPORT" ? "active" : ""}
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
