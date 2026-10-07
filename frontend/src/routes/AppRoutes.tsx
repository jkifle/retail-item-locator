import { Routes, Route } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import PrivateLayout from "../layouts/AuthLayout";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { SignupPage } from "../pages/SignupPage";
import { HelpPage } from "../pages/HelpPage";

import { DashboardPage } from "../pages/DashboardPage";
import { ItemManagementPage } from "../pages/ItemManagementPage";
import { SettingsPage } from "../pages/SettingsPage";
import { ProductSyncPage } from "../pages/ProductSyncPage";
import { AdminRolePage } from "../pages/AdminRolePage";

import { NotFoundPage } from "../pages/NotFoundPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { TermsPage } from "../pages/TermsPage";

export default function AppRoutes() {
  return (
    <Routes>
      {/* ---------- Public Routes ---------- */}
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="help" element={<HelpPage />} />
      </Route>

      {/* ---------- Private Routes ---------- */}
      <Route
        element={
          <ProtectedRoute>
            <PrivateLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route
          path="admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminRolePage />
            </ProtectedRoute>
          }
        />
        <Route path="sync" element={<ProductSyncPage />} />
        <Route path="items" element={<ItemManagementPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* ---------- Fallback ---------- */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
