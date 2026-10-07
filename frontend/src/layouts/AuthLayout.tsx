import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  RefreshCw,
  Settings,
  Shield,
  HelpCircle,
  LogOut,
  X,
} from "lucide-react";

import { Button } from "../pages/ui/button";
import { AuthHeader } from "../components/Header";
import { useAuth } from "../components/AuthContext";

function PrivateLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Item Management", icon: Package, path: "/items" },
    { label: "Product Sync", icon: RefreshCw, path: "/sync" },
    { label: "Users & Roles", icon: Shield, path: "/admin" },
    { label: "Settings", icon: Settings, path: "/settings" },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="font-semibold">RetailLocator</h2>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map(({ label, icon: Icon, path }) => (
            <button
              key={path}
              onClick={() => {
                navigate(path);
                setSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-muted transition-colors"
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}

          <button
            onClick={() => navigate("/help")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
          >
            <HelpCircle className="w-5 h-5" />
            Help Center
          </button>
        </nav>

        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-2" />
            Log Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <AuthHeader onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default PrivateLayout;
