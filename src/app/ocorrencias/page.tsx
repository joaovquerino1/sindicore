"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import { AppLayout } from "@/components/layout/app-layout";
import { formatDateTime } from "@/lib/utils";
import {
  AlertTriangle,
  Plus,
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  Wrench,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExportMenu } from "@/components/export-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Occurrence {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  unitNumber?: string;
  createdAt: string;
  resolvedAt?: string;
  user?: { name: string };
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  baixa: { label: "Baixa", color: "bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300" },
  media: { label: "Média", color: "bg-yellow-100 dark:bg-yellow-500/15 text-yellow-800 dark:text-yellow-300" },
  alta: { label: "Alta", color: "bg-orange-100 dark:bg-orange-500/15 text-orange-800" },
  urgente: { label: "Urgente", color: "bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300" },
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  aberto: { label: "Aberto", color: "bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300", icon: AlertTriangle },
  em_andamento: { label: "Em Andamento", color: "bg-yellow-100 dark:bg-yellow-500/15 text-yellow-800 dark:text-yellow-300", icon: Wrench },
  resolvido: { label: "Resolvido", color: "bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300", icon: CheckCircle2 },
  encerrado: { label: "Encerrado", color: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200", icon: Clock },
};

const categoryLabels: Record<string, string> = {
  geral: "Geral",
  manutencao: "Manutenção",
  seguranca: "Segurança",
  barulho: "Barulho",
  vazamento: "Vazamento",
  outros: "Outros",
};

export default function OcorrenciasPage() {
  const { currentCondominiumId } = useAppStore();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterPriority, setFilterPriority] = useState("todos");
  const [dialog, setDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editingOccurrence, setEditingOccurrence] = useState<Occurrence | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "geral",
    priority: "media",
    unitNumber: "",
  });

  const loadOccurrences = useCallback(async () => {
    if (!currentCondominiumId) return;
    setLoading(true);
    const params = new URLSearchParams({ condominiumId: currentCondominiumId });
    if (filterStatus !== "todos") params.append("status", filterStatus);
    if (filterPriority !== "todos") params.append("priority", filterPriority);
    const res = await fetch(`/api/occurrences?${params}`);
    if (res.ok) setOccurrences(await res.json());
    setLoading(false);
  }, [currentCondominiumId, filterStatus, filterPriority]);

  useEffect(() => { loadOccurrences(); }, [loadOccurrences]);

  const handleCreate = async () => {
    const res = await fetch("/api/occurrences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, condominiumId: currentCondominiumId }),
    });
    if (res.ok) {
      toast.success("Ocorrência registrada!");
      setDialog(false);
      setForm({ title: "", description: "", category: "geral", priority: "media", unitNumber: "" });
      loadOccurrences();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta ocorrência?")) return;
    const res = await fetch(`/api/occurrences/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Ocorrência excluída!"); loadOccurrences(); }
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/occurrences/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success("Status atualizado!");
      loadOccurrences();
    }
  };

  const filtered = occurrences.filter((o) =>
    !search ||
    o.title.toLowerCase().includes(search.toLowerCase()) ||
    o.description.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    aberto: occurrences.filter((o) => o.status === "aberto").length,
    em_andamento: occurrences.filter((o) => o.status === "em_andamento").length,
    urgente: occurrences.filter((o) => o.priority === "urgente" && o.status !== "resolvido").length,
  };

  return (
    <AppLayout>
      <div className="space-y-5 max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Ocorrências</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Gestão de chamados e incidentes</p>
          </div>
          <div className="flex gap-2">
            <ExportMenu
              resource="occurrences"
              params={currentCondominiumId ? { condominiumId: currentCondominiumId } : {}}
            />
            <Button onClick={() => setDialog(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4" />
              Nova Ocorrência
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-red-100 dark:border-red-500/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.aberto}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Em Aberto</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-100 dark:border-amber-500/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Wrench className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.em_andamento}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Em Andamento</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-100">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.urgente}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Urgentes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              className="pl-9"
              placeholder="Buscar ocorrências..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="resolvido">Resolvido</SelectItem>
              <SelectItem value="encerrado">Encerrado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400 dark:text-slate-500" />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => {
              const pc = priorityConfig[o.priority];
              const sc = statusConfig[o.status] || statusConfig.aberto;
              const StatusIcon = sc.icon;
              return (
                <Card
                  key={o.id}
                  className={cn(
                    "hover:shadow-md transition-shadow",
                    o.priority === "urgente" && o.status !== "resolvido" && "border-red-200 dark:border-red-500/30"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{o.title}</h3>
                          <Badge className={`text-xs ${pc.color}`}>{pc.label}</Badge>
                          <Badge className={`text-xs ${sc.color} flex items-center gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {sc.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {categoryLabels[o.category]}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{o.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 dark:text-slate-500">
                          {o.unitNumber && <span>Unidade {o.unitNumber}</span>}
                          {o.user && <span>Por: {o.user.name}</span>}
                          <span>{formatDateTime(o.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        {o.status === "aberto" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-yellow-600 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/30 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 gap-1"
                            onClick={() => updateStatus(o.id, "em_andamento")}
                          >
                            <Wrench className="h-3.5 w-3.5" />
                            Iniciar
                          </Button>
                        )}
                        {o.status === "em_andamento" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 gap-1"
                            onClick={() => updateStatus(o.id, "resolvido")}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Resolver
                          </Button>
                        )}
                        {o.status === "resolvido" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(o.id, "encerrado")}
                          >
                            Encerrar
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-red-500"
                          onClick={() => handleDelete(o.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Nova Ocorrência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Descreva brevemente o problema"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Geral</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="seguranca">Segurança</SelectItem>
                    <SelectItem value="barulho">Barulho</SelectItem>
                    <SelectItem value="vazamento">Vazamento</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Unidade (opcional)</Label>
              <Input
                value={form.unitNumber}
                onChange={(e) => setForm({ ...form, unitNumber: e.target.value })}
                placeholder="Ex: 301"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descreva detalhadamente a ocorrência..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!form.title || !form.description}
              className="bg-blue-600 hover:bg-blue-700 text-white">
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
