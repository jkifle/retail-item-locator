// src/App.tsx
import React, { useState } from "react";
import type { AppView } from "./types";
import ItemLookup from "../components/ItemLookup";
import BulkImport from "../components/BulkImport";
import "./App.css";

const App: React.FC = () => {
  // Sets the default view to 'lookup'
  const [currentView, setCurrentView] = useState<AppView>("lookup");

  // Function to render the active component based on the state
  const renderView = () => {
    switch (currentView) {
      case "lookup":
        return <ItemLookup />;
      case "import":
        return <BulkImport />;
      default:
        return <ItemLookup />;
    }
  };

  return (
    <div className="container">
      <header className="header">
        {/* Navigation Buttons */}
        <button
          onClick={() => setCurrentView("lookup")}
          disabled={currentView === "lookup"}
          className={currentView === "lookup" ? "active" : ""}
        >
          🔍 Item Locator
        </button>
        <button
          onClick={() => setCurrentView("import")}
          disabled={currentView === "import"}
          className={currentView === "import" ? "active" : ""}
        >
          📦 Bulk Import
        </button>
      </header>

      <main className="main-content">{renderView()}</main>
    </div>
  );
};

export default App;
