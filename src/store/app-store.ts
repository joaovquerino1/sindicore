import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  condominiums: {
    id: string;
    role: string;
    condominium: {
      id: string;
      name: string;
      city: string;
      state: string;
    };
  }[];
}

interface AppState {
  user: User | null;
  currentCondominiumId: string | null;
  sidebarOpen: boolean;
  setUser: (user: User | null) => void;
  setCurrentCondominiumId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      currentCondominiumId: null,
      sidebarOpen: true,
      setUser: (user) => set({ user }),
      setCurrentCondominiumId: (id) => set({ currentCondominiumId: id }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      logout: () => set({ user: null, currentCondominiumId: null }),
    }),
    {
      name: "sindicore-app",
      partialize: (state) => ({
        currentCondominiumId: state.currentCondominiumId,
      }),
    }
  )
);
