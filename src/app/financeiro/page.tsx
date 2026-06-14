"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import { AppLayout } from "@/components/layout/app-layout";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  Search,
  Receipt,
  Wallet,
  Barcode,
} from "lucide-react";
import { ExportMenu } from "@/components/export-menu";
import { ImportModal } from "@/components/import-modal";
import { BoletoPreview } from "@/components/shared/boleto-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Finance {
  id: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: string;
  unitNumber?: string;
  observation?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pendente: { label: "Pendente", color: "bg-yellow-100 dark:bg-yellow-500/15 text-yellow-800 dark:text-yellow-300", icon: Clock },
  pago: { label: "Pago", color: "bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300", icon: CheckCircle2 },
  atrasado: { label: "Atrasado", color: "bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300", icon: AlertCircle },
  cancelado: { label: "Cancelado", color: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300", icon: AlertCircle },
};

const categoryLabels: Record<string, string> = {
  condominio: "Condomínio",
  energia: "Energia",
  agua: "Água",
  limpeza: "Limpeza",
  manutencao: "Manutenção",
  seguranca: "Segurança",
  multa: "Multa",
  reserva: "Fundo de Reserva",
  outros: "Outros",
};

export default function FinanceiroPage() {
  const { currentCondominiumId } = useAppStore();
  const [data, setData] = useState<{ finances: Finance[]; summary: any[] }>({ finances: [], summary: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("todos");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingFinance, setEditingFinance] = useState<Finance | null>(null);
  const [boletoFinance, setBoletoFinance] = useState<Finance | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    description: "Taxa Condominial",
    category: "condominio",
    amount: "",
    dueDate: "",
    onlyOccupied: true,
  });
  const [form, setForm] = useState({
    type: "despesa",
    category: "manutencao",
    description: "",
    amount: "",
    dueDate: "",
    unitNumber: "",
    observation: "",
  });

  const loadFinances = useCallback(async () => {
    if (!currentCondominiumId) return;
    setLoading(true);
    const params = new URLSearchParams({ condominiumId: currentCondominiumId });
    if (tab !== "todos" && tab !== "grafico" && tab !== "gestao") params.append("type", tab);
    const res = await fetch(`/api/finances?${params}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [currentCondominiumId, tab]);

  useEffect(() => { loadFinances(); }, [loadFinances]);

  const openCreate = () => {
    setEditingFinance(null);
    setForm({ type: "despesa", category: "manutencao", description: "", amount: "", dueDate: "", unitNumber: "", observation: "" });
    setDialog(true);
  };

  const handleSave = async () => {
    const payload = { ...form, amount: parseFloat(form.amount), condominiumId: currentCondominiumId };
    if (editingFinance) {
      const res = await fetch(`/api/finances/${editingFinance.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) toast.success("Registro atualizado!");
    } else {
      const res = await fetch("/api/finances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) toast.success("Registro criado!");
    }
    setDialog(false);
    loadFinances();
  };

  const markAsPaid = async (id: string) => {
    const res = await fetch(`/api/finances/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pago" }),
    });
    if (res.ok) { toast.success("Marcado como pago!"); loadFinances(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este registro?")) return;
    const res = await fetch(`/api/finances/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Removido!"); loadFinances(); }
  };

  const handleBulkGenerate = async () => {
    if (!currentCondominiumId) return;
    setBulkLoading(true);
    const res = await fetch("/api/finances/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        condominiumId: currentCondominiumId,
        type: "receita",
        category: bulkForm.category,
        description: bulkForm.description,
        amount: parseFloat(bulkForm.amount),
        dueDate: bulkForm.dueDate,
        onlyOccupied: bulkForm.onlyOccupied,
      }),
    });
    if (res.ok) {
      const result = await res.json();
      toast.success(`${result.count} cobrança(s) gerada(s)!`);
      setBulkOpen(false);
      setBulkForm({ ...bulkForm, amount: "", dueDate: "" });
      loadFinances();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Erro ao gerar cobranças");
    }
    setBulkLoading(false);
  };

  const receitas = data.finances.filter((f) => f.type === "receita");
  const despesas = data.finances.filter((f) => f.type === "despesa");
  const totalReceitas = receitas.reduce((sum, f) => sum + (f.status === "pago" ? f.amount : 0), 0);
  const totalDespesas = despesas.reduce((sum, f) => sum + (f.status === "pago" ? f.amount : 0), 0);
  const saldo = totalReceitas - totalDespesas;
  const pendentes = data.finances.filter((f) => f.status === "pendente").reduce((sum, f) => sum + f.amount, 0);

  const displayedBase = tab === "todos" ? data.finances : tab === "receita" ? receitas : despesas;
  const displayed = search
    ? displayedBase.filter((f) =>
        f.description.toLowerCase().includes(search.toLowerCase()) ||
        f.category.toLowerCase().includes(search.toLowerCase()) ||
        (f.unitNumber ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : displayedBase;

  // Build last-6-months chart data from all records
  const monthNames = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const chartData = (() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
      const rec = data.finances
        .filter((f) => f.type === "receita" && f.dueDate.startsWith(key))
        .reduce((s, f) => s + f.amount, 0);
      const desp = data.finances
        .filter((f) => f.type === "despesa" && f.dueDate.startsWith(key))
        .reduce((s, f) => s + f.amount, 0);
      return { mes: label, receitas: rec, despesas: desp, saldo: rec - desp };
    });
  })();

  return (
    <AppLayout>
      <div className="space-y-5 max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Financeiro</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Controle de receitas e despesas</p>
          </div>
          <div className="flex gap-2">
            <ExportMenu
              resource="finances"
              params={currentCondominiumId ? { condominiumId: currentCondominiumId } : {}}
            />
            <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Importar
            </Button>
            <Button onClick={openCreate} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4" />
              Novo Registro
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-500/15">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-300" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Receitas (pagas)</p>
                  <p className="font-bold text-green-600 dark:text-green-300">{formatCurrency(totalReceitas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-500/15">
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-300" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Despesas (pagas)</p>
                  <p className="font-bold text-red-600 dark:text-red-300">{formatCurrency(totalDespesas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", saldo >= 0 ? "bg-blue-100 dark:bg-blue-500/15" : "bg-orange-100 dark:bg-orange-500/15")}>
                  <DollarSign className={cn("h-5 w-5", saldo >= 0 ? "text-blue-600 dark:text-blue-300" : "text-orange-600 dark:text-orange-300")} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Saldo</p>
                  <p className={cn("font-bold", saldo >= 0 ? "text-blue-600 dark:text-blue-300" : "text-orange-600 dark:text-orange-300")}>
                    {formatCurrency(saldo)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-500/15">
                  <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-300" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">A vencer</p>
                  <p className="font-bold text-yellow-600 dark:text-yellow-300">{formatCurrency(pendentes)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <Input
            className="pl-9"
            placeholder="Buscar por descrição, categoria, unidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="receita">Receitas</TabsTrigger>
            <TabsTrigger value="despesa">Despesas</TabsTrigger>
            <TabsTrigger value="grafico">Gráfico</TabsTrigger>
            <TabsTrigger value="gestao" className="gap-1.5">
              <Wallet className="h-3.5 w-3.5" />
              Gestão
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {tab === "gestao" ? (
              <div className="space-y-4">
                <Card className="border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10/30 dark:bg-blue-500/10">
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-500/15">
                          <Receipt className="h-5 w-5 text-blue-700 dark:text-blue-300" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Gerar cobranças em lote</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            Cria uma cobrança para cada unidade do condomínio com o mesmo valor e vencimento.
                          </p>
                        </div>
                      </div>
                      <Button onClick={() => setBulkOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="h-4 w-4" />
                        Nova Geração
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Boletos pendentes</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Receitas em aberto — clique em "Boleto" para visualizar e imprimir.
                    </p>
                  </div>
                </div>

                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium">Descrição</th>
                          <th className="text-left px-4 py-3 font-medium">Unidade</th>
                          <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Categoria</th>
                          <th className="text-left px-4 py-3 font-medium">Vencimento</th>
                          <th className="text-right px-4 py-3 font-medium">Valor</th>
                          <th className="px-4 py-3 w-44"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.finances
                          .filter((f) => f.type === "receita" && f.status === "pendente")
                          .map((f) => (
                            <tr key={f.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{f.description}</td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                {f.unitNumber ? `Unid. ${f.unitNumber}` : "—"}
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-300 hidden md:table-cell">
                                <Badge variant="outline" className="text-xs">
                                  {categoryLabels[f.category] || f.category}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(f.dueDate)}</td>
                              <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                                {formatCurrency(f.amount)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-1">
                                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"
                                    onClick={() => setBoletoFinance(f)}>
                                    <Barcode className="h-3.5 w-3.5" />
                                    Boleto
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs text-green-600 dark:text-green-300 border-green-200 dark:border-green-500/30 hover:bg-green-50 dark:hover:bg-green-500/10"
                                    onClick={() => markAsPaid(f.id)}>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Pagar
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        {data.finances.filter((f) => f.type === "receita" && f.status === "pendente").length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center text-slate-400 dark:text-slate-500 py-10 text-sm">
                              Nenhum boleto pendente. Use "Nova Geração" para criar cobranças em lote.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            ) : tab === "grafico" ? (
              <>
                <Card className="mb-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-500 dark:text-slate-400 font-medium">Últimos 6 meses — Receitas × Despesas</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 pb-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                          tickFormatter={(v) => `R$${Number(v) >= 1000 ? `${(Number(v)/1000).toFixed(0)}k` : v}`} />
                        <Tooltip
                          contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }}
                          formatter={(value, name) => [
                            `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                            name === "receitas" ? "Receitas" : "Despesas",
                          ]}
                        />
                        <Legend formatter={(v) => String(v) === "receitas" ? "Receitas" : "Despesas"} />
                        <Bar dataKey="receitas" fill="#22c55e" radius={[4,4,0,0]} />
                        <Bar dataKey="despesas" fill="#ef4444" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <div className="grid grid-cols-3 gap-3">
                  {chartData.map((d) => (
                    <Card key={d.mes}>
                      <CardContent className="p-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">{d.mes}</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Receitas</span>
                            <span className="text-green-600 dark:text-green-300 font-medium">{d.receitas > 0 ? `R$ ${d.receitas.toLocaleString("pt-BR",{minimumFractionDigits:2})}` : "—"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Despesas</span>
                            <span className="text-red-500 dark:text-red-300 font-medium">{d.despesas > 0 ? `R$ ${d.despesas.toLocaleString("pt-BR",{minimumFractionDigits:2})}` : "—"}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t">
                            <span className="text-slate-600 dark:text-slate-300 font-medium">Saldo</span>
                            <span className={cn("font-bold", d.saldo >= 0 ? "text-blue-600 dark:text-blue-300" : "text-orange-600 dark:text-orange-300")}>
                              R$ {d.saldo.toLocaleString("pt-BR",{minimumFractionDigits:2})}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400 dark:text-slate-500" />
              </div>
            ) : (
              <div className="space-y-2">
                {displayed.length === 0 ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-12">
                      <p className="text-slate-400 dark:text-slate-500">Nenhum registro encontrado</p>
                    </CardContent>
                  </Card>
                ) : (
                  displayed.map((f) => {
                    const sc = statusConfig[f.status] || statusConfig.pendente;
                    const StatusIcon = sc.icon;
                    return (
                      <Card key={f.id} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={cn("p-2 rounded-lg flex-shrink-0", f.type === "receita" ? "bg-green-100 dark:bg-green-500/15" : "bg-red-100 dark:bg-red-500/15")}>
                                {f.type === "receita" ? (
                                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-300" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-300" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium truncate">{f.description}</p>
                                  <Badge variant="outline" className="text-xs flex-shrink-0">
                                    {categoryLabels[f.category] || f.category}
                                  </Badge>
                                  <Badge className={`text-xs flex-shrink-0 flex items-center gap-1 ${sc.color}`}>
                                    <StatusIcon className="h-3 w-3" />
                                    {sc.label}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                  Venc: {formatDate(f.dueDate)}
                                  {f.paidDate && ` · Pago: ${formatDate(f.paidDate)}`}
                                  {f.unitNumber && ` · Unidade ${f.unitNumber}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className={cn("font-bold text-base", f.type === "receita" ? "text-green-600 dark:text-green-300" : "text-red-600 dark:text-red-300")}>
                                {f.type === "receita" ? "+" : "-"}{formatCurrency(f.amount)}
                              </span>
                              {f.status === "pendente" && (
                                <Button size="sm" variant="outline" className="text-green-600 dark:text-green-300 border-green-200 dark:border-green-500/30 hover:bg-green-50 dark:hover:bg-green-500/10" onClick={() => markAsPaid(f.id)}>
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                  Pagar
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 dark:text-red-300 hover:text-red-600 dark:hover:text-red-400" onClick={() => handleDelete(f.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </TabsContent>

        </Tabs>
      </div>

      <ImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        resource="finances"
        condominiumId={currentCondominiumId ?? ""}
        onSuccess={loadFinances}
      />

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingFinance ? "Editar Registro" : "Novo Registro Financeiro"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Descrição *</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição do lançamento" />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>Vencimento *</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Input value={form.unitNumber} onChange={(e) => setForm({ ...form, unitNumber: e.target.value })} placeholder="Ex: 101" />
            </div>
            <div className="space-y-2">
              <Label>Observação</Label>
              <Input value={form.observation} onChange={(e) => setForm({ ...form, observation: e.target.value })} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.description || !form.amount || !form.dueDate}
              className="bg-blue-600 hover:bg-blue-700 text-white">
              {editingFinance ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Gerar cobranças em lote</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={bulkForm.description}
                onChange={(e) => setBulkForm({ ...bulkForm, description: e.target.value })}
                placeholder="Ex: Taxa Condominial Outubro"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={bulkForm.category}
                onValueChange={(v) => setBulkForm({ ...bulkForm, category: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor por unidade (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={bulkForm.amount}
                onChange={(e) => setBulkForm({ ...bulkForm, amount: e.target.value })}
                placeholder="450,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Vencimento *</Label>
              <Input
                type="date"
                value={bulkForm.dueDate}
                onChange={(e) => setBulkForm({ ...bulkForm, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Aplicar a</Label>
              <Select
                value={bulkForm.onlyOccupied ? "occupied" : "all"}
                onValueChange={(v) => setBulkForm({ ...bulkForm, onlyOccupied: v === "occupied" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="occupied">Apenas unidades ocupadas</SelectItem>
                  <SelectItem value="all">Todas as unidades</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handleBulkGenerate}
              disabled={!bulkForm.description || !bulkForm.amount || !bulkForm.dueDate || bulkLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              {bulkLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Gerar Cobranças
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BoletoPreview
        open={!!boletoFinance}
        onOpenChange={(v) => !v && setBoletoFinance(null)}
        finance={boletoFinance}
      />
    </AppLayout>
  );
}
