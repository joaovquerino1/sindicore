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
} from "lucide-react";
import { ExportMenu } from "@/components/export-menu";
import { ImportModal } from "@/components/import-modal";
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
  pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  pago: { label: "Pago", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  atrasado: { label: "Atrasado", color: "bg-red-100 text-red-800", icon: AlertCircle },
  cancelado: { label: "Cancelado", color: "bg-slate-100 text-slate-600", icon: AlertCircle },
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
    if (tab !== "todos" && tab !== "grafico") params.append("type", tab);
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
            <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
            <p className="text-slate-500 text-sm mt-0.5">Controle de receitas e despesas</p>
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
                <div className="p-2 rounded-lg bg-green-100">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Receitas (pagas)</p>
                  <p className="font-bold text-green-600">{formatCurrency(totalReceitas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Despesas (pagas)</p>
                  <p className="font-bold text-red-600">{formatCurrency(totalDespesas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", saldo >= 0 ? "bg-blue-100" : "bg-orange-100")}>
                  <DollarSign className={cn("h-5 w-5", saldo >= 0 ? "text-blue-600" : "text-orange-600")} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Saldo</p>
                  <p className={cn("font-bold", saldo >= 0 ? "text-blue-600" : "text-orange-600")}>
                    {formatCurrency(saldo)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">A vencer</p>
                  <p className="font-bold text-yellow-600">{formatCurrency(pendentes)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {tab === "grafico" ? (
              <>
                <Card className="mb-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-500 font-medium">Últimos 6 meses — Receitas × Despesas</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 pb-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                          tickFormatter={(v: number) => `R$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                        <Tooltip
                          contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }}
                          formatter={(value: number, name: string) => [
                            `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                            name === "receitas" ? "Receitas" : "Despesas",
                          ]}
                        />
                        <Legend formatter={(v: string) => v === "receitas" ? "Receitas" : "Despesas"} />
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
                        <p className="text-xs text-slate-500 font-medium mb-2">{d.mes}</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Receitas</span>
                            <span className="text-green-600 font-medium">{d.receitas > 0 ? `R$ ${d.receitas.toLocaleString("pt-BR",{minimumFractionDigits:2})}` : "—"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Despesas</span>
                            <span className="text-red-500 font-medium">{d.despesas > 0 ? `R$ ${d.despesas.toLocaleString("pt-BR",{minimumFractionDigits:2})}` : "—"}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t">
                            <span className="text-slate-600 font-medium">Saldo</span>
                            <span className={cn("font-bold", d.saldo >= 0 ? "text-blue-600" : "text-orange-600")}>
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
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {displayed.length === 0 ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-12">
                      <p className="text-slate-400">Nenhum registro encontrado</p>
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
                              <div className={cn("p-2 rounded-lg flex-shrink-0", f.type === "receita" ? "bg-green-100" : "bg-red-100")}>
                                {f.type === "receita" ? (
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-red-600" />
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
                                <p className="text-xs text-slate-400 mt-0.5">
                                  Venc: {formatDate(f.dueDate)}
                                  {f.paidDate && ` · Pago: ${formatDate(f.paidDate)}`}
                                  {f.unitNumber && ` · Unidade ${f.unitNumber}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className={cn("font-bold text-base", f.type === "receita" ? "text-green-600" : "text-red-600")}>
                                {f.type === "receita" ? "+" : "-"}{formatCurrency(f.amount)}
                              </span>
                              {f.status === "pendente" && (
                                <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => markAsPaid(f.id)}>
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                  Pagar
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => handleDelete(f.id)}>
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
    </AppLayout>
  );
}
