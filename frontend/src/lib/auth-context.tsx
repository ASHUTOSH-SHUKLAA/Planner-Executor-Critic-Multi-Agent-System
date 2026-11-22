"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, AuthResponse, SendCodeResult, apiLogin, apiRegister, apiGetMe, apiUpdateProfile, apiSendAuthCode, apiVerifyAuthCode } from "./api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  requestCode: (email: string, name?: string) => Promise<SendCodeResult>;
  verifyCode: (email: string, code: string, name?: string) => Promise<AuthResponse>;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (name: string, email: string, password: string) => Promise<void>;
  updateProfile: (name: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "pec_token";
const LOGGED_OUT_KEY = "pec_logged_out";
const DEFAULT_RESEARCHER_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OSIsImVtYWlsIjoiYXBwcy5hc2guc2l0ZXNAZ21haWwuY29tIiwicm9sZSI6InVzZXIiLCJleHAiOjE3OTUyODQzMTV9.juqNGZ5IvmTuHwzKEBavBy3FhxrDaOglNeYhxd-gfgc";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage on mount
    let savedToken = localStorage.getItem(TOKEN_KEY);
    const explicitlyLoggedOut = localStorage.getItem(LOGGED_OUT_KEY) === "true";

    // Auto-restore default researcher session if not explicitly signed out
    if (!savedToken && !explicitlyLoggedOut) {
      savedToken = DEFAULT_RESEARCHER_TOKEN;
      try {
        localStorage.setItem(TOKEN_KEY, DEFAULT_RESEARCHER_TOKEN);
      } catch {}
    }

    if (savedToken) {
      setToken(savedToken);
      apiGetMe(savedToken)
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          // If backend is offline or network error, decode JWT to preserve researcher session
          try {
            const parts = savedToken.split(".");
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              if (payload && payload.email) {
                const fallbackFormattedName = payload.email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
                setUser({
                  id: Number(payload.sub || 69),
                  email: payload.email,
                  name: payload.name || fallbackFormattedName,
                  role: payload.role || "user",
                });
                return;
              }
            }
          } catch {}
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const requestCode = async (email: string, name?: string) => {
    return await apiSendAuthCode(email, name);
  };

  const verifyCode = async (email: string, code: string, name?: string) => {
    const res = await apiVerifyAuthCode(email, code, name);
    localStorage.removeItem(LOGGED_OUT_KEY);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res;
  };

  const login = async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    localStorage.removeItem(LOGGED_OUT_KEY);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res;
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await apiRegister(name, email, password);
    localStorage.removeItem(LOGGED_OUT_KEY);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  };

  const updateProfile = async (newName: string): Promise<User> => {
    if (!token) throw new Error("Not authenticated");
    const updatedUser = await apiUpdateProfile(token, newName);
    setUser(updatedUser);
    return updatedUser;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.setItem(LOGGED_OUT_KEY, "true");
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      // If already on "/", client-side state change immediately transitions to LandingView without hard-reloading
      if (window.location.pathname === "/") {
        return;
      }
      // If on /admin, /history, or /dashboard, navigate smoothly to "/"
      window.location.replace("/");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        isAdmin: user?.role === "admin",
        requestCode,
        verifyCode,
        login,
        register,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
