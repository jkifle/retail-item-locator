import ProductImport from "../components/ProductImport";

export function ProductSyncPage() {
  return (
    <div className="space-y-6">
      <h1>Product Sync</h1>
      <p>Import product records into your organization from a CSV file.</p>
      <ProductImport />
    </div>
  );
}
