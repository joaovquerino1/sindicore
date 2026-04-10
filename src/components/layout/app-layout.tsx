"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { Toaster } from "@/components/ui/sonner";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const { user, setUser, currentCondominiumId, setCurrentCondominiumId } = useAppStore();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) {
          router.push("/login");
          return;
        }
        setUser(data);
        if (!currentCondominiumId && data.condominiums?.length > 0) {
          setCurrentCondominiumId(data.condominiums[0].condominium.id);
        }
      });
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-500">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        {/* pb-16 on mobile reserves space for the fixed BottomNav (56px) */}
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:pb-6 lg:p-6">
          {children}
        </main>
      </div>
      {/* Mobile tab bar — hidden on desktop */}
      <BottomNav />
      <Toaster richColors position="top-right" />
    </div>
  );
}
