import { Button } from "../pages/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Search,
  Bell,
  User,
  ArrowRight,
  Menu,
  HelpCircle,
  LogOut,
} from "lucide-react";

import { Input } from "../pages/ui/input";
import { Avatar, AvatarFallback } from "../pages/ui/avatar";
import { Badge } from "../pages/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../pages/ui/dropdown-menu";
import { useAuth } from "./AuthContext";

function PublicHeader() {
  const navigate = useNavigate();

  return (
    <nav className="border-b bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Package className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-semibold">RetailLocator</h2>
              </div>
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/login")}>
              Sign In
            </Button>
            <Button onClick={() => navigate("/signup")}>
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

interface AuthHeaderProps {
  onMenuClick: () => void;
}

function AuthHeader({ onMenuClick }: AuthHeaderProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const userInitials = user?.display_name
    ? user.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || "U";

  const userEmail = user?.email || "Email unavailable";
  const userName = user?.display_name || "User";

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <header className="border-b bg-card sticky top-0 z-40">
      <div className="flex items-center gap-4 px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>

        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Quick search (Ctrl+K)"
              className="pl-9 bg-muted/50"
            />
          </div>
        </div>

        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0"
          >
            3
          </Badge>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted">
              <Avatar>
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-medium">{userName}</span>
                <span className="text-xs text-muted-foreground">
                  {userEmail}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {userEmail}
              </p>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <User className="w-4 h-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate("/help")}>
              <HelpCircle className="w-4 h-4 mr-2" />
              Help & Support
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export { PublicHeader, AuthHeader };
