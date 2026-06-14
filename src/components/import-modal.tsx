"use client";

import { useState, useRef, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, Loader2, CheckCircle, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";

interface ImportResult {
  created: number;
  errors: { row: number; message: string }[];
}

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: "residents" | "finances";
  condominiumId: string;
  onSuccess?: () => void;
}

const RESOURCE_LABELS: Record<string, string> = {
  residents: "Moradores",
  finances: "Financeiro",
};

const TEMPLATE_DESCRIPTIONS: Record<string, { columns: string[]; example: string }> = {
  residents: {
    columns: ["Nome", "CPF", "Telefone", "E-mail", "Tipo", "Nº Unidade"],
    example: "João Silva, 123.456.789-00, (11) 99999-0000, joao@email.com, proprietario, 101",
  },
  finances: {
    columns: ["Tipo", "Categoria", "Descrição", "Valor", "Vencimento (DD/MM/AAAA)", "Nº Unidade", "Observação"],
    example: "receita, taxa_condominio, Taxa Jan/2026, 850.00, 05/01/2026, 101, Pagamento antecipado",
  },
};

export function ImportModal({ open, onOpenChange, resource, condominiumId, onSuccess }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const meta = TEMPLATE_DESCRIPTIONS[resource];
  const label = RESOURCE_LABELS[resource];

  const downloadTemplate = () => {
    const p = new URLSearchParams({ condominiumId, format: "csv", template: "true" });
    window.location.href = `/api/export/${resource}?${p}`;
  };

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("condominiumId", condominiumId);
    const res = await fetch(`/api/import/${resource}`, { method: "POST", body: fd });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setResult(data);
      if (data.created > 0) {
        toast.success(`${data.created} registro${data.created !== 1 ? "s" : ""} importado${data.created !== 1 ? "s" : ""}!`);
        onSuccess?.();
      } else {
        toast.error("Nenhum registro foi importado. Verifique os erros.");
      }
    } else {
      toast.error(data.error || "Erro na importação");
    }
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setFile(null);
      setResult(null);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Importar {label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template info */}
          <div className="rounded-lg border bg-blue-50 dark:bg-blue-500/10 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Formato esperado</p>
              <Button size="sm" variant="link" className="p-0 h-auto text-blue-600 dark:text-blue-300 gap-1"
                onClick={downloadTemplate}>
                <Download className="h-3.5 w-3.5" /> Template CSV
              </Button>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 font-mono">
              {meta.columns.join(" | ")}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ex: {meta.example}</p>
          </div>

          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragging ? "border-blue-400 bg-blue-50 dark:bg-blue-500/10" : "hover:border-slate-300 dark:hover:border-slate-700"
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5 text-blue-500 dark:text-blue-300" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{file.name}</span>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Clique ou arraste o arquivo aqui</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">CSV ou Excel (.xlsx)</p>
              </>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />

          {/* Results */}
          {result && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>{result.created} registro{result.created !== 1 ? "s" : ""} importado{result.created !== 1 ? "s" : ""} com sucesso</span>
              </div>
              {result.errors.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-red-600 dark:text-red-300">
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Linha {e.row}: {e.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Fechar</Button>
          <Button
            onClick={handleImport}
            disabled={!file || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
