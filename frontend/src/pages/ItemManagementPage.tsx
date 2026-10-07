import BulkImport from "../components/BulkImport";

export function ItemManagementPage() {
  return (
    <div className="space-y-6">
      <h1>Item Locations</h1>
      <p>Scan items or import a list to assign shelf locations in your organization.</p>
      <BulkImport />
    </div>
  );
}
