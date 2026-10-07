import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { useAuth } from "../components/AuthContext";
import { doSignInWithEmailAndPassword } from "../firebase/auth";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, initialized, error: authError } = useAuth();

  // Redirect when authenticated
  useEffect(() => {
    if (initialized && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, initialized, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await doSignInWithEmailAndPassword(email, password);
      // AuthContext will handle user state, useEffect will trigger redirect
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
              <Package className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="mb-2">Welcome back</h1>
            <p className="text-muted-foreground">
              Sign in to your RetailLocator account
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {(error || authError) && (
                  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
                    {error || authError}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember" disabled={loading} />
                    <label htmlFor="remember" className="cursor-pointer">
                      Remember me
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => navigate("/forgot-password")}
                    disabled={loading}
                  >
                    Forgot password?
                  </Button>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-muted-foreground">
                  Don't have an account?{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => navigate("/signup")}
                    disabled={loading}
                  >
                    Sign up
                  </Button>
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => navigate("/")}
              className="text-muted-foreground"
              disabled={loading}
            >
              ← Back to home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
