"use client";

import { useAppStore } from "@/store/app-store";
import { Menu, Building2, ChevronDown, Plus, Settings } from "lucide-react";
import Link from "next/link";

export function Header() {
  const { user, currentCondominiumId, setCurrentCondominiumId, setSidebarOpen, sidebarOpen } =
    useAppStore();

  const currentCondo = user?.condominiums?.find(
    (c) => c.condominium.id === currentCondominiumId
  );

  return (
    <header className="flex-shrink-0 flex items-center gap-3 h-16 px-4 lg:px-6 border-b border-slate-200 bg-white">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Condominium selector */}
      <div className="flex items-center gap-2 flex-1">
        <div className="relative group">
          <button className="flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-sm font-medium text-slate-700 transition-colors max-w-xs">
            <Building2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <span className="truncate">
              {currentCondo?.condominium.name ?? "Selecionar condomínio"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          </button>

          {/* Dropdown — always accessible */}
          <div className="absolute top-full left-0 mt-1 w-72 rounded-lg border border-slate-200 bg-white shadow-lg z-50 py-1 hidden group-focus-within:block">
            {user?.condominiums?.map(({ condominium }) => (
              <button
                key={condominium.id}
                onClick={() => setCurrentCondominiumId(condominium.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left ${
                  condominium.id === currentCondominiumId ? "bg-blue-50" : ""
                }`}
              >
                <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                  condominium.id === currentCondominiumId ? "bg-blue-600" : "bg-slate-100"
                }`}>
                  <Building2 className={`h-4 w-4 ${condominium.id === currentCondominiumId ? "text-white" : "text-slate-500"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{condominium.name}</p>
                  <p className="text-xs text-slate-500">{condominium.city}, {condominium.state}</p>
                </div>
              </button>
            ))}

            <div className="border-t border-slate-100 mt-1 pt-1">
              <Link
                href="/configuracoes"
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left w-full"
              >
                <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Plus className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-blue-600">Novo Condomínio</p>
              </Link>
              <Link
                href="/configuracoes"
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left w-full"
              >
                <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Settings className="h-4 w-4 text-slate-500" />
                </div>
                <p className="text-sm text-slate-600">Gerenciar condomínios</p>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Date */}
      <span className="text-xs text-slate-400 hidden md:block capitalize">
        {new Date().toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}
      </span>
    </header>
  );
}
