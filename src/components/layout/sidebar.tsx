"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { getInitials } from "@/lib/utils";
import {
  LayoutDashboard, Building2, Users, UserCheck, AlertTriangle,
  DollarSign, CalendarDays, Bell, Settings, LogOut, Menu,
  ChevronLeft, Video,
} from "lucide-react";

type NavGroup = {
  label?: string;
  items: { href: string; label: string; icon: React.ElementType }[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operação",
    items: [
      { href: "/edificio",     label: "Edifício",    icon: Building2 },
      { href: "/moradores",    label: "Moradores",   icon: Users },
      { href: "/visitantes",   label: "Visitantes",  icon: UserCheck },
      { href: "/ocorrencias",  label: "Ocorrências", icon: AlertTriangle },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/financeiro",   label: "Financeiro",   icon: DollarSign },
      { href: "/areas-comuns", label: "Áreas Comuns", icon: CalendarDays },
      { href: "/avisos",       label: "Avisos",       icon: Bell },
      { href: "/assembleias",  label: "Assembleias",  icon: Video },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  admin:    "Administrador",
  sindico:  "Síndico",
  porteiro: "Porteiro",
  morador:  "Morador",
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, sidebarOpen, setSidebarOpen, logout } = useAppStore();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    logout();
    router.push("/login");
  };

  return (
    <>
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out",
          "bg-gradient-mesh border-r border-slate-800/60",
          sidebarOpen ? "w-64" : "w-16",
          "lg:relative lg:translate-x-0",
          !sidebarOpen && "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo + toggle */}
        <div
          className={cn(
            "flex items-center h-16 border-b border-slate-800/60 flex-shrink-0",
            sidebarOpen ? "px-4" : "justify-center"
          )}
        >
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-primary shadow-lg shadow-blue-600/30">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-white text-base tracking-tight leading-none">
                    SindiCore
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-0.5">
                    Gestão Condominial
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                aria-label="Recolher menu"
                className="flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Expandir menu"
              className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto">
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className={cn(gIdx > 0 && "mt-4")}>
              {group.label && sidebarOpen && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={!sidebarOpen ? label : undefined}
                      className={cn(
                        "group relative flex items-center rounded-lg py-2.5 text-sm font-medium transition-all duration-150",
                        sidebarOpen ? "gap-3 px-3" : "justify-center px-0",
                        active
                          ? "bg-white/10 text-white"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                      )}
                      onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-blue-500" />
                      )}
                      <Icon className={cn(
                        "h-[18px] w-[18px] flex-shrink-0 transition-transform",
                        active ? "text-blue-400" : "group-hover:scale-110"
                      )} />
                      {sidebarOpen && <span className="truncate">{label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="flex-shrink-0 px-2 pb-3 space-y-0.5 border-t border-slate-800/60 pt-3">
          {user && sidebarOpen && (
            <div className="flex items-center gap-3 px-3 py-2.5 mb-1 rounded-lg bg-white/5">
              <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 text-xs font-bold text-white shadow-lg shadow-blue-600/30">
                {getInitials(user.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-100 truncate leading-tight">
                  {user.name}
                </p>
                <p className="text-xs text-slate-500 leading-tight">
                  {ROLE_LABELS[user.role] || user.role}
                </p>
              </div>
            </div>
          )}
          {user && !sidebarOpen && (
            <div className="flex justify-center py-1.5">
              <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-blue-600/30">
                {getInitials(user.name)}
              </div>
            </div>
          )}
          <Link
            href="/configuracoes"
            title={!sidebarOpen ? "Configurações" : undefined}
            className={cn(
              "flex items-center rounded-lg py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-100 transition-colors",
              sidebarOpen ? "gap-3 px-3" : "justify-center px-0"
            )}
          >
            <Settings className="h-[18px] w-[18px] flex-shrink-0" />
            {sidebarOpen && <span>Configurações</span>}
          </Link>
          <button
            onClick={handleLogout}
            title={!sidebarOpen ? "Sair" : undefined}
            className={cn(
              "w-full flex items-center rounded-lg py-2 text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors",
              sidebarOpen ? "gap-3 px-3" : "justify-center px-0"
            )}
          >
            <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
