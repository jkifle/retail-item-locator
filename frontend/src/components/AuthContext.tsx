// src/components/AuthContext.tsx
import { API_URL } from "../services/api";
import { clearSessionCache, invalidateSessionCache } from "../services/sessionCache";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  getIdToken,
  onAuthStateChange,
  doUpdateDisplayName,
  doSignOut as firebaseSignOut,
} from "../firebase/auth";

interface User {
  user_id: string;
  client_id: string;
  email: string;
  display_name?: string;
  role?: string;
  is_active?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initialized: boolean;
  signOut: () => Promise<void>;
  getAuthToken: () => Promise<string | null>;
  updateDisplayName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);



  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      clearSessionCache();
      setIsLoading(true);
      setError(null);
      try {
        if (firebaseUser) {
          const idToken = await getIdToken();
          const response = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || data.error || "Application login failed");
          }
          setUser(data.data.user);
        } else {
          setUser(null);
          localStorage.removeItem("authToken");

        }
      } catch (err) {
        console.error("Auth error:", err);
        setError(err instanceof Error ? err.message : "Auth error");
        setUser(null);
        localStorage.removeItem("authToken");
      } finally {
        setIsLoading(false);
        setInitialized(true);
      }
    });

    return unsubscribe;
  }, []);

  const signOut = useCallback(async () => {
    clearSessionCache();
    setIsLoading(true);
    try {
      await firebaseSignOut();
      setUser(null);
      localStorage.removeItem("authToken");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      return await getIdToken();
    } catch (err) {
      console.error("Failed to get auth token:", err);
      setError("Failed to get authentication token");
      return null;
    }
  }, []);

  const updateDisplayName = useCallback(async (name: string) => {
    await doUpdateDisplayName(name);
    const idToken = await getIdToken(true);
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || result.error || "Unable to save profile");
    invalidateSessionCache("/api/users");
    setUser(result.data.user);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    initialized,
    signOut,
    getAuthToken,
    updateDisplayName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Auth context and hook are intentionally colocated.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
