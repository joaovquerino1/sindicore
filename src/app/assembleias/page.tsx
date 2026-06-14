"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Video,
  VideoOff,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  Users,
  Play,
  FileText,
  ListOrdered,
  CheckCircle2,
  XCircle,
  Loader2,
  CalendarClock,
  ExternalLink,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Assembly {
  id: string;
  condominiumId: string;
  title: string;
  description?: string;
  agenda?: string;
  type: string;
  status: string;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  meetingId?: string;
  attendeesCount?: number;
  minutesText?: string;
  createdAt: string;
}

type FilterTab = "todas" | "agendada" | "em_andamento" | "encerrada" | "cancelada";

interface AssemblyForm {
  title: string;
  description: string;
  agenda: string;
  type: string;
  scheduledAt: string;
}

const emptyForm: AssemblyForm = {
  title: "",
  description: "",
  agenda: "",
  type: "ordinaria",
  scheduledAt: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; color: string }> = {
  agendada:     { label: "Agendada",      color: "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  em_andamento: { label: "Em andamento",  color: "bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-300" },
  encerrada:    { label: "Encerrada",     color: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" },
  cancelada:    { label: "Cancelada",     color: "bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-300" },
};

const typeLabel: Record<string, string> = {
  ordinaria:      "Ordinária",
  extraordinaria: "Extraordinária",
};

function formatScheduledAt(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function toInputDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AssembleiasPage() {
  const { currentCondominiumId } = useAppStore();
  const router = useRouter();

  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("todas");

  // Create/Edit dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssemblyForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Detail dialog
  const [detailAssembly, setDetailAssembly] = useState<Assembly | null>(null);

  // Minutes dialog
  const [minutesAssembly, setMinutesAssembly] = useState<Assembly | null>(null);
  const [minutesText, setMinutesText] = useState("");
  const [attendeesCount, setAttendeesCount] = useState<number>(0);
  const [savingMinutes, setSavingMinutes] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadAssemblies = useCallback(async () => {
    if (!currentCondominiumId) return;
    setLoading(true);
    const res = await fetch(`/api/assemblies?condominiumId=${currentCondominiumId}`);
    if (res.ok) setAssemblies(await res.json());
    setLoading(false);
  }, [currentCondominiumId]);

  useEffect(() => { loadAssemblies(); }, [loadAssemblies]);

  const displayed = filter === "todas" ? assemblies : assemblies.filter(a => a.status === filter);

  const stats = {
    total:       assemblies.length,
    agendada:    assemblies.filter(a => a.status === "agendada").length,
    emAndamento: assemblies.filter(a => a.status === "em_andamento").length,
    encerrada:   assemblies.filter(a => a.status === "encerrada").length,
  };

  // ── Create/Edit ───────────────────────────────────────────────────────────

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setFormOpen(true); };

  const openEdit = (a: Assembly) => {
    setEditingId(a.id);
    setForm({
      title:       a.title,
      description: a.description ?? "",
      agenda:      a.agenda ?? "",
      type:        a.type,
      scheduledAt: toInputDatetime(a.scheduledAt),
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Título é obrigatório"); return; }
    if (!form.scheduledAt)  { toast.error("Data/hora é obrigatória"); return; }
    setSaving(true);
    const payload = {
      condominiumId: currentCondominiumId,
      title:         form.title.trim(),
      description:   form.description.trim() || null,
      agenda:        form.agenda.trim() || null,
      type:          form.type,
      scheduledAt:   new Date(form.scheduledAt).toISOString(),
    };
    const url = editingId ? `/api/assemblies/${editingId}` : "/api/assemblies";
    const res = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) { toast.success(editingId ? "Assembleia atualizada!" : "Assembleia criada!"); setFormOpen(false); loadAssemblies(); }
    else toast.error("Erro ao salvar assembleia.");
    setSaving(false);
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta assembleia?")) return;
    const res = await fetch(`/api/assemblies/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Assembleia excluída!"); loadAssemblies(); }
    else toast.error("Erro ao excluir.");
  };

  // ── Cancel ────────────────────────────────────────────────────────────────

  const handleCancel = async (id: string) => {
    if (!confirm("Cancelar esta assembleia?")) return;
    const res = await fetch(`/api/assemblies/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelada" }),
    });
    if (res.ok) { toast.success("Assembleia cancelada."); loadAssemblies(); }
    else toast.error("Erro ao cancelar.");
  };

  // ── Start / Join meeting (opens internal meeting room) ────────────────────

  const handleEnterMeeting = async (assembly: Assembly) => {
    // Mark as em_andamento on first start
    if (assembly.status === "agendada") {
      await fetch(`/api/assemblies/${assembly.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status:    "em_andamento",
          startedAt: new Date().toISOString(),
          meetingId: assembly.id,
        }),
      });
      await loadAssemblies();
    }
    // Open meeting room in new tab so user can return and record minutes
    window.open(
      `/reuniao/${assembly.id}?title=${encodeURIComponent(assembly.title)}`,
      "_blank"
    );
  };

  // ── Open minutes dialog ───────────────────────────────────────────────────

  const openMinutes = (assembly: Assembly) => {
    setMinutesAssembly(assembly);
    setMinutesText(assembly.minutesText ?? "");
    setAttendeesCount(assembly.attendeesCount ?? 0);
  };

  // ── Save minutes & end assembly ───────────────────────────────────────────

  const handleSaveMinutes = async () => {
    if (!minutesAssembly) return;
    setSavingMinutes(true);
    const res = await fetch(`/api/assemblies/${minutesAssembly.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status:        "encerrada",
        endedAt:       new Date().toISOString(),
        minutesText:   minutesText.trim() || null,
        attendeesCount,
      }),
    });
    if (res.ok) {
      toast.success("Assembleia encerrada e ata registrada!");
      setMinutesAssembly(null);
      loadAssemblies();
    } else {
      toast.error("Erro ao registrar ata.");
    }
    setSavingMinutes(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      {/* ── Minutes dialog ────────────────────────────────────────────────── */}
      <Dialog open={!!minutesAssembly} onOpenChange={() => setMinutesAssembly(null)}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              Encerrar e registrar ata
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Registre o número de participantes e a ata antes de encerrar a assembleia.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="attendees">Número de participantes</Label>
              <Input
                id="attendees"
                type="number"
                min={0}
                value={attendeesCount}
                onChange={e => setAttendeesCount(Number(e.target.value))}
                placeholder="Ex: 12"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="minutes">Ata da reunião</Label>
              <Textarea
                id="minutes"
                value={minutesText}
                onChange={e => setMinutesText(e.target.value)}
                placeholder="Registre os principais pontos discutidos, decisões tomadas e votações realizadas…"
                className="min-h-[160px] resize-y"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setMinutesAssembly(null)}>Cancelar</Button>
              <Button onClick={handleSaveMinutes} disabled={savingMinutes} className="gap-2">
                {savingMinutes && <Loader2 className="h-4 w-4 animate-spin" />}
                <CheckCircle2 className="h-4 w-4" />
                Finalizar e salvar ata
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Detail dialog ─────────────────────────────────────────────────── */}
      <Dialog open={!!detailAssembly} onOpenChange={() => setDetailAssembly(null)}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              Detalhes da Assembleia
            </DialogTitle>
          </DialogHeader>
          {detailAssembly && (
            <div className="space-y-4 pt-1 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={statusConfig[detailAssembly.status]?.color ?? "bg-slate-100 dark:bg-slate-800"}>
                  {statusConfig[detailAssembly.status]?.label ?? detailAssembly.status}
                </Badge>
                <Badge variant="outline">
                  {typeLabel[detailAssembly.type] ?? detailAssembly.type}
                </Badge>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base">{detailAssembly.title}</h3>
                {detailAssembly.description && (
                  <p className="text-slate-500 dark:text-slate-400 mt-1">{detailAssembly.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <CalendarClock className="h-4 w-4" />
                <span>{formatScheduledAt(detailAssembly.scheduledAt)}</span>
              </div>
              {detailAssembly.agenda && (
                <div className="space-y-1">
                  <p className="font-medium text-slate-700 dark:text-slate-200">Pauta:</p>
                  <p className="text-slate-500 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">{detailAssembly.agenda}</p>
                </div>
              )}
              {detailAssembly.attendeesCount != null && (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Users className="h-4 w-4" />
                  <span>{detailAssembly.attendeesCount} participante(s)</span>
                </div>
              )}
              {detailAssembly.minutesText && (
                <div className="space-y-1">
                  <p className="font-medium text-slate-700 dark:text-slate-200">Ata:</p>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed border border-slate-100 dark:border-slate-800">
                    {detailAssembly.minutesText}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create/Edit dialog ────────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              {editingId ? "Editar Assembleia" : "Nova Assembleia"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Assembleia Geral Ordinária 2025"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="type">Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ordinaria">Ordinária</SelectItem>
                    <SelectItem value="extraordinaria">Extraordinária</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="scheduledAt">Data e hora *</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Breve descrição sobre a assembleia"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="agenda">Pauta</Label>
                <Textarea
                  id="agenda"
                  value={form.agenda}
                  onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))}
                  placeholder="Liste os itens da pauta, um por linha…"
                  className="min-h-[100px] resize-y"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Salvar alterações" : "Criar assembleia"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Assembleias</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Gerencie assembleias e reuniões online do condomínio
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Assembleia
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total",        value: stats.total,       icon: CalendarClock, color: "text-slate-600 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-800" },
            { label: "Agendadas",    value: stats.agendada,    icon: Clock,         color: "text-blue-600 dark:text-blue-300",  bg: "bg-blue-50 dark:bg-blue-500/10"   },
            { label: "Em andamento", value: stats.emAndamento, icon: Video,         color: "text-green-600 dark:text-green-300", bg: "bg-green-50 dark:bg-green-500/10"  },
            { label: "Encerradas",   value: stats.encerrada,   icon: CheckCircle2,  color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-900/50"  },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs + list */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="flex border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
            {(["todas", "agendada", "em_andamento", "encerrada", "cancelada"] as FilterTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  filter === tab ? "border-blue-600 text-blue-600 dark:text-blue-300" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {tab === "todas" ? "Todas" : tab === "agendada" ? "Agendadas" : tab === "em_andamento" ? "Em andamento" : tab === "encerrada" ? "Encerradas" : "Canceladas"}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-400 dark:text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Carregando assembleias…</span>
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 dark:text-slate-500">
              <CalendarClock className="h-10 w-10 opacity-30" />
              <p className="text-sm">Nenhuma assembleia encontrada</p>
              {filter === "todas" && (
                <Button variant="outline" size="sm" onClick={openCreate} className="gap-1.5 mt-1">
                  <Plus className="h-4 w-4" />
                  Criar primeira assembleia
                </Button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {displayed.map(assembly => {
                const cfg = statusConfig[assembly.status] ?? { label: assembly.status, color: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" };
                return (
                  <li key={assembly.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60/60 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        assembly.status === "em_andamento" ? "bg-green-100 dark:bg-green-500/15" :
                        assembly.status === "encerrada"    ? "bg-slate-100 dark:bg-slate-800" :
                        assembly.status === "cancelada"    ? "bg-red-50 dark:bg-red-500/10"    : "bg-blue-50 dark:bg-blue-500/10"
                      }`}>
                        {assembly.status === "em_andamento" ? <Video className="h-5 w-5 text-green-600 dark:text-green-300" /> :
                         assembly.status === "encerrada"    ? <VideoOff className="h-5 w-5 text-slate-400 dark:text-slate-500" /> :
                         <CalendarClock className={`h-5 w-5 ${assembly.status === "cancelada" ? "text-red-400 dark:text-red-300" : "text-blue-600 dark:text-blue-300"}`} />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-800 dark:text-slate-100">{assembly.title}</span>
                          <Badge className={`${cfg.color} border-0 text-xs px-2`}>{cfg.label}</Badge>
                          <Badge variant="outline" className="text-xs px-2">
                            {typeLabel[assembly.type] ?? assembly.type}
                          </Badge>
                        </div>
                        {assembly.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">{assembly.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatScheduledAt(assembly.scheduledAt)}
                          </span>
                          {assembly.attendeesCount != null && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {assembly.attendeesCount} participante(s)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Details */}
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" title="Ver detalhes" onClick={() => setDetailAssembly(assembly)}>
                          <FileText className="h-4 w-4" />
                        </Button>

                        {/* Enter meeting */}
                        {(assembly.status === "agendada" || assembly.status === "em_andamento") && (
                          <Button
                            size="sm"
                            className={`gap-1.5 h-8 px-3 ${assembly.status === "em_andamento" ? "bg-green-600 hover:bg-green-700" : ""}`}
                            onClick={() => handleEnterMeeting(assembly)}
                          >
                            {assembly.status === "em_andamento"
                              ? <><ExternalLink className="h-3.5 w-3.5" />Entrar</>
                              : <><Play className="h-3.5 w-3.5" />Iniciar</>
                            }
                          </Button>
                        )}

                        {/* End & record minutes */}
                        {assembly.status === "em_andamento" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-xs gap-1 text-slate-600 dark:text-slate-300"
                            title="Encerrar e registrar ata"
                            onClick={() => openMinutes(assembly)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Encerrar
                          </Button>
                        )}

                        {/* Edit */}
                        {assembly.status !== "encerrada" && assembly.status !== "cancelada" && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" title="Editar" onClick={() => openEdit(assembly)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Cancel */}
                        {assembly.status === "agendada" && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 dark:text-slate-500 hover:text-orange-600" title="Cancelar" onClick={() => handleCancel(assembly.id)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Delete */}
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400" title="Excluir" onClick={() => handleDelete(assembly.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
