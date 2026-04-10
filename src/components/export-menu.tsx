"use client";

import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportMenuProps {
  resource: string;
  params?: Record<string, string>;
}

export function ExportMenu({ resource, params = {} }: ExportMenuProps) {
  const download = (format: "csv" | "xlsx") => {
    const p = new URLSearchParams({ ...params, format });
    window.location.href = `/api/export/${resource}?${p}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => download("csv")}>
          <FileText className="h-4 w-4 mr-2 text-slate-500" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => download("xlsx")}>
          <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
          Excel (.xlsx)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
