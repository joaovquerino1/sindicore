"use client";

import { useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { generateBoleto, barcodeToInterleaved } from "@/lib/boleto";

interface BoletoFinance {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  unitNumber?: string | null;
  category: string;
}

interface BoletoPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finance: BoletoFinance | null;
  condominiumName?: string;
}

export function BoletoPreview({ open, onOpenChange, finance, condominiumName }: BoletoPreviewProps) {
  const ref = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    if (!finance) return null;
    return generateBoleto({
      id: finance.id,
      amount: finance.amount,
      dueDate: finance.dueDate,
    });
  }, [finance]);

  const barcodeSvg = useMemo(() => {
    if (!data) return null;
    const { width, bars } = barcodeToInterleaved(data.barcode);
    const height = 50;
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-12"
        role="img"
        aria-label="Código de barras"
      >
        {bars
          .filter((b) => b.black)
          .map((b, i) => (
            <rect key={i} x={b.x} y={0} width={b.w} height={height} fill="black" />
          ))}
      </svg>
    );
  }, [data]);

  const handlePrint = () => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Boleto ${finance?.id ?? ""}</title>
      <style>
        body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 24px; color: #0f172a; }
        .boleto { max-width: 760px; margin: 0 auto; border: 1px solid #cbd5e1; }
        .row { display: flex; }
        .cell { padding: 6px 10px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; flex: 1; }
        .cell:last-child { border-right: 0; }
        .label { font-size: 9px; text-transform: uppercase; color: #64748b; letter-spacing: 0.04em; }
        .value { font-size: 13px; font-weight: 600; }
        .header { background: #0f172a; color: white; padding: 10px 12px; display:flex; align-items:center; gap:10px; }
        .bank { font-size: 22px; font-weight: 800; letter-spacing: 0.02em; }
        .linha { font-family: ui-monospace, monospace; font-size: 14px; letter-spacing: 0.04em; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
        svg { display: block; width: 100%; height: 60px; }
        @media print { @page { margin: 12mm; } }
      </style></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 200);
  };

  if (!finance || !data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" aria-describedby={undefined}>
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 pr-6">
            <DialogTitle>Boleto · {finance.description}</DialogTitle>
            <Button size="sm" variant="outline" className="gap-2" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" />
              Imprimir
            </Button>
          </div>
        </DialogHeader>

        {/* Boleto sempre claro — é um documento "imprimível" */}
        <div ref={ref} className="bg-white text-slate-900 rounded-md p-1">
          <div className="boleto border border-slate-300 rounded-md overflow-hidden">
            <div className="header bg-slate-900 text-white flex items-center gap-3 px-3 py-2.5">
              <div className="bank text-xl font-extrabold tracking-wide">237-2 | BRADESCO</div>
              <div className="ml-auto text-xs text-slate-300">SindiCORE · Cobrança</div>
            </div>

            <div className="linha font-mono text-sm tracking-wider px-3 py-2 border-b border-slate-200">
              {data.linhaDigitavel}
            </div>

            <div className="row flex">
              <div className="cell flex-1 px-3 py-1.5 border-r border-slate-200">
                <p className="label text-[9px] uppercase text-slate-500 tracking-wider">Cedente</p>
                <p className="value text-sm font-semibold">{condominiumName ?? "Condomínio"}</p>
              </div>
              <div className="cell flex-1 px-3 py-1.5">
                <p className="label text-[9px] uppercase text-slate-500 tracking-wider">Agência / Código do Cedente</p>
                <p className="value text-sm font-semibold">1234 / 56789-0</p>
              </div>
            </div>

            <div className="row flex">
              <div className="cell flex-1 px-3 py-1.5 border-r border-slate-200">
                <p className="label text-[9px] uppercase text-slate-500 tracking-wider">Nosso número</p>
                <p className="value text-sm font-semibold">{data.nossoNumero}</p>
              </div>
              <div className="cell flex-1 px-3 py-1.5 border-r border-slate-200">
                <p className="label text-[9px] uppercase text-slate-500 tracking-wider">Vencimento</p>
                <p className="value text-sm font-semibold">{formatDate(finance.dueDate)}</p>
              </div>
              <div className="cell flex-1 px-3 py-1.5">
                <p className="label text-[9px] uppercase text-slate-500 tracking-wider">Valor do documento</p>
                <p className="value text-sm font-semibold">{formatCurrency(finance.amount)}</p>
              </div>
            </div>

            <div className="row flex">
              <div className="cell flex-[2] px-3 py-1.5 border-r border-slate-200">
                <p className="label text-[9px] uppercase text-slate-500 tracking-wider">Pagador</p>
                <p className="value text-sm font-semibold">
                  {finance.unitNumber ? `Unidade ${finance.unitNumber}` : "—"}
                </p>
              </div>
              <div className="cell flex-1 px-3 py-1.5">
                <p className="label text-[9px] uppercase text-slate-500 tracking-wider">Categoria</p>
                <p className="value text-sm font-semibold capitalize">{finance.category}</p>
              </div>
            </div>

            <div className="px-3 py-3">
              <p className="label text-[9px] uppercase text-slate-500 tracking-wider mb-1">Instruções</p>
              <p className="text-xs text-slate-600">
                Após o vencimento, sujeito a multa de 2% e juros de 1% ao mês.
                Não receber após 60 dias do vencimento.
              </p>
            </div>

            <div className="px-3 pt-2 pb-4 border-t border-slate-200">
              {barcodeSvg}
              <p className="text-[10px] text-slate-400 text-center mt-1">
                * Boleto demonstrativo gerado pelo SindiCORE (sem registro bancário real).
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
