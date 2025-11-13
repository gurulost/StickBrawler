import { create } from "zustand";
import { apiRequest } from "../queryClient";

export interface AuthUser {
  id: number;
  username: string;
  highScore: number | null;
}

interface AuthState {
  user: AuthUser | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  error: string | null;
  
  fetchMe: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  status: "idle",
  error: null,

  fetchMe: async () => {
    if (get().status === "loading") return;
    
    set({ status: "loading", error: null });
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.ok) {
        const user = await response.json();
        set({ user, status: "authenticated", error: null });
      } else {
        set({ user: null, status: "unauthenticated", error: null });
      }
    } catch (error) {
      set({
        user: null,
        status: "unauthenticated",
        error: error instanceof Error ? error.message : "Failed to fetch user",
      });
    }
  },

  login: async (username: string, password: string) => {
    set({ status: "loading", error: null });
    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        username,
        password,
      });
      const user = await response.json();
      set({ user, status: "authenticated", error: null });
    } catch (error) {
      set({
        user: null,
        status: "unauthenticated",
        error: error instanceof Error ? error.message : "Login failed",
      });
      throw error;
    }
  },

  register: async (username: string, password: string) => {
    set({ status: "loading", error: null });
    try {
      const response = await apiRequest("POST", "/api/auth/register", {
        username,
        password,
      });
      const user = await response.json();
      set({ user, status: "authenticated", error: null });
    } catch (error) {
      set({
        user: null,
        status: "unauthenticated",
        error: error instanceof Error ? error.message : "Registration failed",
      });
      throw error;
    }
  },

  logout: async () => {
    set({ status: "loading", error: null });
    try {
      await apiRequest("POST", "/api/auth/logout", undefined);
      set({ user: null, status: "unauthenticated", error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Logout failed",
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
