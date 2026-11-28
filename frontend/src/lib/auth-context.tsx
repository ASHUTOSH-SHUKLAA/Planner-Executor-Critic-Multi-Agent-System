"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  AuthResponse,
  SendCodeResult,
  apiLogin,
  apiRegister,
  apiGetMe,
  apiUpdateProfile,
  apiSendAuthCode,
  apiVerifyAuthCode,
  apiGoogleAuth,
  apiGoogleAuthCode,
  apiGetGoogleAuthConfig,
} from "./api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  googleClientId: string | null;
  requestCode: (email: string, name?: string) => Promise<SendCodeResult>;
  verifyCode: (email: string, code: string, name?: string) => Promise<AuthResponse>;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<AuthResponse>;
  loginWithGoogleCode: (code: string, redirectUri: string) => Promise<AuthResponse>;
  updateProfile: (name: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "pec_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [googleClientId, setGoogleClientId] = useState<string | null>(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage on mount
    const savedToken = localStorage.getItem(TOKEN_KEY);

    if (savedToken) {
      setToken(savedToken);
      apiGetMe(savedToken)
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          // Token is invalid or expired: clear session cleanly
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }

    // Load Google OAuth Client ID if not provided statically
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      apiGetGoogleAuthConfig().then((cfg) => {
        if (cfg.client_id) {
          setGoogleClientId(cfg.client_id);
        }
      });
    }
  }, []);

  const requestCode = async (email: string, name?: string) => {
    return await apiSendAuthCode(email, name);
  };

  const verifyCode = async (email: string, code: string, name?: string) => {
    const res = await apiVerifyAuthCode(email, code, name);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res;
  };

  const login = async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res;
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await apiRegister(name, email, password);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  };

  const loginWithGoogle = async (credential: string) => {
    const res = await apiGoogleAuth(credential, googleClientId || undefined);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res;
  };

  const loginWithGoogleCode = async (code: string, redirectUri: string) => {
    const res = await apiGoogleAuthCode(code, redirectUri);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res;
  };

  const updateProfile = async (newName: string): Promise<User> => {
    if (!token) throw new Error("Not authenticated");
    const updatedUser = await apiUpdateProfile(token, newName);
    setUser(updatedUser);
    return updatedUser;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
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
        googleClientId,
        requestCode,
        verifyCode,
        login,
        register,
        loginWithGoogle,
        loginWithGoogleCode,
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
