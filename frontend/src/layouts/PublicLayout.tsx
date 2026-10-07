import { Outlet } from "react-router-dom";
import Footer from "../components/Footer";
import { PublicHeader } from "../components/Header";
export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
