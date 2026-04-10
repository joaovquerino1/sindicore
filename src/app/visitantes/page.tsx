"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import { AppLayout } from "@/components/layout/app-layout";
import { formatDateTime } from "@/lib/utils";
import {
  UserCheck, Plus, Search, Clock, CheckCircle2,
  XCircle, ArrowRight, Loader2, RefreshCw, LogOut, Car, Hash,
} from "lucide-react";
import { ExportMenu } from "@/components/export-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type VStatus = "aguardando" | "autorizado" | "negado" | "saiu";

interface Visitor {
  id: string; name: string; document?: string; phone?: string;
  reason?: string; vehiclePlate?: string; status: VStatus;
  entryAt?: string; exitAt?: string; observation?: string;
  unit: { number: string; floor: { tower: { name: string } } };
  createdAt: string;
}

const STATUS: Record<VStatus, { label: string; bg: string; text: string; border: string; icon: React.ElementType }> = {
  aguardando: { label: "Aguardando", bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200", icon: Clock },
  autorizado: { label: "Autorizado", bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200", icon: CheckCircle2 },
  negado:     { label: "Negado",     bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",   icon: XCircle },
  saiu:       { label: "Saiu",       bg: "bg-slate-100", text: "text-slate-600",  border: "border-slate-200", icon: ArrowRight },
};

export default function VisitantesPage() {
  const { currentCondominiumId } = useAppStore();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [dialog, setDialog] = useState(false);
  const [units, setUnits] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "", document: "", phone: "", reason: "",
    vehiclePlate: "", unitId: "", observation: "",
  });

  const loadVisitors = useCallback(async () => {
    if (!currentCondominiumId) return;
    setLoading(true);
    const p = new URLSearchParams({ condominiumId: currentCondominiumId });
    if (filterStatus !== "todos") p.append("status", filterStatus);
    if (search) p.append("search", search);
    const res = await fetch(`/api/visitors?${p}`);
    if (res.ok) setVisitors(await res.json());
    setLoading(false);
  }, [currentCondominiumId, filterStatus, search]);

  useEffect(() => {
    loadVisitors();
    const interval = setInterval(loadVisitors, 30000);
    return () => clearInterval(interval);
  }, [loadVisitors]);

  useEffect(() => {
    if (!currentCondominiumId) return;
    fetch(`/api/units?condominiumId=${currentCondominiumId}`).then(r => r.json()).then(setUnits);
  }, [currentCondominiumId]);

  const handleCreate = async () => {
    const res = await fetch("/api/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("Visitante registrado!");
      setDialog(false);
      setForm({ name: "", document: "", phone: "", reason: "", vehiclePlate: "", unitId: "", observation: "" });
      loadVisitors();
    } else toast.error("Erro ao registrar visitante");
  };

  const updateStatus = async (id: string, status: VStatus) => {
    const res = await fetch(`/api/visitors/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const msgs: Record<VStatus, string> = {
        autorizado: "Entrada autorizada!", negado: "Entrada negada",
        saiu: "Saída registrada!", aguardando: "Status atualizado",
      };
      toast.success(msgs[status]);
      loadVisitors();
    }
  };

  const activeCount = visitors.filter(v => ["aguardando", "autorizado"].includes(v.status)).length;

  return (
    <AppLayout>
      <div className="space-y-5 max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Visitantes</h1>
            <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
              Controle de acesso em tempo real
              {activeCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  {activeCount} no condomínio
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={loadVisitors} title="Atualizar">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <ExportMenu
              resource="visitors"
              params={currentCondominiumId ? { condominiumId: currentCondominiumId } : {}}
            />
            <Button onClick={() => setDialog(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4" />
              Registrar Visitante
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input className="pl-9" placeholder="Buscar por nome, documento, placa..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="aguardando">Aguardando</SelectItem>
              <SelectItem value="autorizado">Autorizado</SelectItem>
              <SelectItem value="negado">Negado</SelectItem>
              <SelectItem value="saiu">Saiu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          </div>
        ) : visitors.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <UserCheck className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">Nenhum visitante encontrado</p>
              <p className="text-sm text-slate-400 mt-1">Ajuste os filtros ou registre um novo visitante</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {visitors.map((v) => {
              const sc = STATUS[v.status] || STATUS.aguardando;
              const Icon = sc.icon;
              return (
                <Card key={v.id} className={cn(
                  "transition-all hover:shadow-sm",
                  v.status === "aguardando" && "border-amber-200 bg-amber-50/30"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-slate-500">
                          {v.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-900">{v.name}</p>
                            <span className={cn(
                              "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border",
                              sc.bg, sc.text, sc.border
                            )}>
                              <Icon className="h-3 w-3" />
                              {sc.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Apto <strong className="text-slate-700">{v.unit?.number}</strong>
                            {" · "}{v.unit?.floor?.tower?.name}
                            {v.reason && ` · ${v.reason}`}
                          </p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {v.document && (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Hash className="h-3 w-3" />{v.document}
                              </span>
                            )}
                            {v.vehiclePlate && (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Car className="h-3 w-3" />{v.vehiclePlate}
                              </span>
                            )}
                            <span className="text-xs text-slate-400">{formatDateTime(v.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {v.status === "aguardando" && (
                          <>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5 h-8"
                              onClick={() => updateStatus(v.id, "autorizado")}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Autorizar
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5 h-8"
                              onClick={() => updateStatus(v.id, "negado")}>
                              <XCircle className="h-3.5 w-3.5" />
                              Negar
                            </Button>
                          </>
                        )}
                        {v.status === "autorizado" && (
                          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-slate-700"
                            onClick={() => updateStatus(v.id, "saiu")}>
                            <LogOut className="h-3.5 w-3.5" />
                            Registrar Saída
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Registrar Visitante</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome do Visitante *</Label>
              <Input placeholder="Nome completo" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Documento (RG/CPF)</Label>
              <Input placeholder="000.000.000-00" value={form.document} onChange={e => setForm({ ...form, document: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input placeholder="(11) 99999-0000" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Unidade Destino *</Label>
              <Select value={form.unitId} onValueChange={v => setForm({ ...form, unitId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {units.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.number} — {u.floor?.tower?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Motivo da Visita</Label>
              <Select value={form.reason} onValueChange={v => setForm({ ...form, reason: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Visita familiar">Visita familiar</SelectItem>
                  <SelectItem value="Entrega">Entrega</SelectItem>
                  <SelectItem value="Manutenção">Manutenção</SelectItem>
                  <SelectItem value="Serviço">Serviço</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Placa do Veículo</Label>
              <Input placeholder="ABC-1234" value={form.vehiclePlate} onChange={e => setForm({ ...form, vehiclePlate: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Observação</Label>
              <Input placeholder="Informações adicionais..." value={form.observation} onChange={e => setForm({ ...form, observation: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!form.name || !form.unitId}
              className="bg-blue-600 hover:bg-blue-700 text-white">
              Registrar Entrada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
