"use client";

import { useAppStore } from "@/store/app-store";
import { Menu, Building2, ChevronDown, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function Header() {
  const { user, currentCondominiumId, setCurrentCondominiumId, setSidebarOpen, sidebarOpen } =
    useAppStore();

  const currentCondo = user?.condominiums?.find(
    (c) => c.condominium.id === currentCondominiumId
  );

  return (
    <header className="flex-shrink-0 flex items-center gap-3 h-16 px-4 lg:px-6 border-b border-border bg-card">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Condominium selector */}
      <div className="flex items-center gap-2 flex-1">
        <div className="relative group">
          <button className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-muted hover:bg-secondary text-sm font-medium text-foreground transition-colors max-w-xs">
            <Building2 className="h-4 w-4 text-violet-500 dark:text-violet-300 flex-shrink-0" />
            <span className="truncate">
              {currentCondo?.condominium.name ?? "Selecionar condomínio"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          </button>

          {/* Dropdown — always accessible */}
          <div className="absolute top-full left-0 mt-1 w-72 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg z-50 py-1 hidden group-focus-within:block">
            {user?.condominiums?.map(({ condominium }) => (
              <button
                key={condominium.id}
                onClick={() => setCurrentCondominiumId(condominium.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted text-left ${
                  condominium.id === currentCondominiumId ? "bg-accent" : ""
                }`}
              >
                <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                  condominium.id === currentCondominiumId ? "bg-violet-500" : "bg-muted"
                }`}>
                  <Building2 className={`h-4 w-4 ${condominium.id === currentCondominiumId ? "text-white" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{condominium.name}</p>
                  <p className="text-xs text-muted-foreground">{condominium.city}, {condominium.state}</p>
                </div>
              </button>
            ))}

            <div className="border-t border-border mt-1 pt-1">
              <Link
                href="/configuracoes"
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted text-left w-full"
              >
                <div className="w-8 h-8 rounded-md bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                  <Plus className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                </div>
                <p className="text-sm font-medium text-violet-600 dark:text-violet-300">Novo Condomínio</p>
              </Link>
              <Link
                href="/configuracoes"
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted text-left w-full"
              >
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-foreground">Gerenciar condomínios</p>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Date */}
        <span className="text-xs text-muted-foreground hidden md:block capitalize">
          {new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}
