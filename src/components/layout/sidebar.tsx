"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { getInitials } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  AlertTriangle,
  DollarSign,
  CalendarDays,
  Bell,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  Shield,
  Video,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { href: "/edificio",     label: "Edifício",     icon: Building2 },
  { href: "/moradores",    label: "Moradores",    icon: Users },
  { href: "/visitantes",   label: "Visitantes",   icon: UserCheck },
  { href: "/ocorrencias",  label: "Ocorrências",  icon: AlertTriangle },
  { href: "/financeiro",   label: "Financeiro",   icon: DollarSign },
  { href: "/areas-comuns", label: "Áreas Comuns", icon: CalendarDays },
  { href: "/avisos",       label: "Avisos",       icon: Bell },
  { href: "/assembleias",  label: "Assembleias",  icon: Video },
];

const roleLabels: Record<string, string> = {
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
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out",
          "bg-slate-900 border-r border-slate-800",
          sidebarOpen ? "w-60" : "w-16",
          "lg:relative lg:translate-x-0",
          !sidebarOpen && "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center h-16 border-b border-slate-800 flex-shrink-0",
          sidebarOpen ? "px-4" : "justify-center"
        )}>
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 flex-shrink-0">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-white text-base tracking-tight">
                  SindiCore
                </span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex-shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={!sidebarOpen ? label : undefined}
                className={cn(
                  "flex items-center rounded-lg py-2.5 text-sm font-medium transition-all duration-150",
                  sidebarOpen ? "gap-3 px-3" : "justify-center px-0",
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                )}
                onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
              >
                <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="flex-shrink-0 px-2 pb-3 space-y-0.5 border-t border-slate-800 pt-3">
          {user && sidebarOpen && (
            <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
                {getInitials(user.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-100 truncate leading-tight">
                  {user.name}
                </p>
                <p className="text-xs text-slate-500 leading-tight">
                  {roleLabels[user.role] || user.role}
                </p>
              </div>
            </div>
          )}
          {user && !sidebarOpen && (
            <div className="flex justify-center py-1.5">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                {getInitials(user.name)}
              </div>
            </div>
          )}
          <Link
            href="/configuracoes"
            title={!sidebarOpen ? "Configurações" : undefined}
            className={cn(
              "flex items-center rounded-lg py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors",
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
              "w-full flex items-center rounded-lg py-2 text-sm text-slate-400 hover:bg-red-900/40 hover:text-red-400 transition-colors",
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
