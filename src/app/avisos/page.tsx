"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import { AppLayout } from "@/components/layout/app-layout";
import { formatDateTime } from "@/lib/utils";
import { Bell, Plus, Megaphone, AlertCircle, Info, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Notice {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: string;
  publishedAt: string;
  expiresAt?: string;
  active: boolean;
}

const priorityConfig: Record<string, { label: string; badge: string; iconBg: string; iconText: string; icon: React.ElementType }> = {
  normal:     { label: "Normal",     badge: "bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-500/30",     iconBg: "bg-blue-100 dark:bg-blue-500/15",   iconText: "text-blue-600 dark:text-blue-300",   icon: Info },
  importante: { label: "Importante", badge: "bg-orange-100 dark:bg-orange-500/15 text-orange-800 border-orange-200", iconBg: "bg-orange-100 dark:bg-orange-500/15", iconText: "text-orange-600 dark:text-orange-300", icon: AlertCircle },
  urgente:    { label: "Urgente",    badge: "bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300 border-red-200 dark:border-red-500/30",         iconBg: "bg-red-100 dark:bg-red-500/15",    iconText: "text-red-600 dark:text-red-300",    icon: Megaphone },
};

const categoryLabels: Record<string, string> = {
  geral: "Geral",
  manutencao: "Manutenção",
  assembleia: "Assembleia",
  financeiro: "Financeiro",
  seguranca: "Segurança",
};

export default function AvisosPage() {
  const { currentCondominiumId } = useAppStore();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "geral",
    priority: "normal",
    expiresAt: "",
  });

  const loadNotices = useCallback(async () => {
    if (!currentCondominiumId) return;
    setLoading(true);
    const res = await fetch(`/api/notices?condominiumId=${currentCondominiumId}`);
    if (res.ok) setNotices(await res.json());
    setLoading(false);
  }, [currentCondominiumId]);

  useEffect(() => { loadNotices(); }, [loadNotices]);

  const handleCreate = async () => {
    const res = await fetch("/api/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        condominiumId: currentCondominiumId,
        expiresAt: form.expiresAt ? new Date(form.expiresAt) : null,
      }),
    });
    if (res.ok) {
      toast.success("Aviso publicado!");
      setDialog(false);
      setForm({ title: "", content: "", category: "geral", priority: "normal", expiresAt: "" });
      loadNotices();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este aviso?")) return;
    const res = await fetch(`/api/notices/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Aviso removido!"); loadNotices(); }
  };

  return (
    <AppLayout>
      <div className="space-y-5 max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Avisos</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Comunicados e informes do condomínio</p>
          </div>
          <Button onClick={() => setDialog(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4" />
            Publicar Aviso
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400 dark:text-slate-500" />
          </div>
        ) : notices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Bell className="h-12 w-12 text-slate-200 dark:text-slate-700 mb-4" />
              <p className="text-slate-500 dark:text-slate-400">Nenhum aviso publicado</p>
              <Button className="mt-4 gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setDialog(true)}>
                <Plus className="h-4 w-4" />
                Publicar Aviso
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notices.map((notice) => {
              const pc = priorityConfig[notice.priority] || priorityConfig.normal;
              const Icon = pc.icon;
              return (
                <Card
                  key={notice.id}
                  className={cn(
                    "border-l-4",
                    notice.priority === "urgente" ? "border-l-red-500" :
                    notice.priority === "importante" ? "border-l-orange-500" :
                    "border-l-blue-400"
                  )}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={cn("p-2 rounded-lg mt-0.5 flex-shrink-0", pc.iconBg)}>
                          <Icon className={cn("h-4 w-4", pc.iconText)} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{notice.title}</h3>
                            <Badge className={`text-xs border ${pc.badge}`}>{pc.label}</Badge>
                            <Badge variant="outline" className="text-xs">{categoryLabels[notice.category]}</Badge>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{notice.content}</p>
                          <div className="flex items-center gap-3 mt-3 text-xs text-slate-400 dark:text-slate-500">
                            <span>Publicado em {formatDateTime(notice.publishedAt)}</span>
                            {notice.expiresAt && (
                              <span>· Expira em {formatDateTime(notice.expiresAt)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 dark:text-red-300 hover:text-red-600 dark:hover:text-red-400 flex-shrink-0"
                        onClick={() => handleDelete(notice.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
            <DialogTitle>Publicar Aviso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título do aviso" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="importante">Importante</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mensagem *</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Conteúdo do aviso..." rows={5} />
            </div>
            <div className="space-y-2">
              <Label>Data de Expiração (opcional)</Label>
              <Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!form.title || !form.content} className="bg-blue-600 hover:bg-blue-700 text-white">Publicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
