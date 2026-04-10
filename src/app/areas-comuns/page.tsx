"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import { AppLayout } from "@/components/layout/app-layout";
import { formatDate } from "@/lib/utils";
import {
  CalendarDays, Plus, Clock, Users, Loader2, Trash2, CheckCircle2, XCircle, List, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CommonArea {
  id: string; name: string; description?: string; capacity?: number;
  openTime?: string; closeTime?: string; rules?: string; active: boolean;
  bookings: Booking[]; _count: { bookings: number };
}

interface Booking {
  id: string; commonAreaId: string; residentName: string; unitNumber: string;
  date: string; startTime: string; endTime: string; status: string; observation?: string;
  commonArea?: { name: string };
}

const bookingStatus: Record<string, { label: string; color: string }> = {
  confirmado: { label: "Confirmado", color: "bg-green-100 text-green-700" },
  cancelado:  { label: "Cancelado",  color: "bg-red-100 text-red-700" },
  pendente:   { label: "Pendente",   color: "bg-amber-100 text-amber-700" },
};

export default function AreasComunsPage() {
  const { currentCondominiumId } = useAppStore();
  const [areas, setAreas] = useState<CommonArea[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("areas");
  const [areaDialog, setAreaDialog] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [bookingDialog, setBookingDialog] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");
  const [areaForm, setAreaForm] = useState({
    name: "", description: "", capacity: "", openTime: "08:00", closeTime: "22:00", rules: "",
  });
  const [bookingForm, setBookingForm] = useState({
    residentName: "", unitNumber: "", date: "", startTime: "10:00", endTime: "12:00", observation: "",
  });

  const loadAreas = useCallback(async () => {
    if (!currentCondominiumId) return;
    setLoading(true);
    const res = await fetch(`/api/common-areas?condominiumId=${currentCondominiumId}`);
    if (res.ok) setAreas(await res.json());
    setLoading(false);
  }, [currentCondominiumId]);

  const loadBookings = useCallback(async () => {
    if (!currentCondominiumId) return;
    const res = await fetch(`/api/bookings?condominiumId=${currentCondominiumId}`);
    if (res.ok) setBookings(await res.json());
  }, [currentCondominiumId]);

  useEffect(() => { loadAreas(); loadBookings(); }, [loadAreas, loadBookings]);

  const openEditArea = (area: CommonArea) => {
    setEditingAreaId(area.id);
    setAreaForm({
      name: area.name,
      description: area.description ?? "",
      capacity: area.capacity?.toString() ?? "",
      openTime: area.openTime ?? "08:00",
      closeTime: area.closeTime ?? "22:00",
      rules: area.rules ?? "",
    });
    setAreaDialog(true);
  };

  const handleSaveArea = async () => {
    const payload = {
      ...areaForm,
      capacity: areaForm.capacity ? parseInt(areaForm.capacity) : null,
    };
    let res: Response;
    if (editingAreaId) {
      res = await fetch(`/api/common-areas/${editingAreaId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch("/api/common-areas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, condominiumId: currentCondominiumId }),
      });
    }
    if (res.ok) {
      toast.success(editingAreaId ? "Área atualizada!" : "Área criada!");
      setAreaDialog(false);
      setEditingAreaId(null);
      setAreaForm({ name: "", description: "", capacity: "", openTime: "08:00", closeTime: "22:00", rules: "" });
      loadAreas();
    }
  };

  const handleDeleteArea = async (id: string) => {
    if (!confirm("Desativar esta área comum?")) return;
    const res = await fetch(`/api/common-areas/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Área desativada!"); loadAreas(); }
  };

  const handleCreateBooking = async () => {
    const res = await fetch("/api/bookings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...bookingForm, commonAreaId: selectedAreaId }),
    });
    if (res.ok) {
      toast.success("Reserva realizada!");
      setBookingDialog(false);
      setBookingForm({ residentName: "", unitNumber: "", date: "", startTime: "10:00", endTime: "12:00", observation: "" });
      loadAreas();
      loadBookings();
    } else {
      toast.error("Erro ao realizar reserva");
    }
  };

  const handleCancelBooking = async (id: string) => {
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelado" }),
    });
    if (res.ok) {
      toast.success("Reserva cancelada");
      loadAreas();
      loadBookings();
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!confirm("Excluir esta reserva?")) return;
    const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Reserva excluída"); loadAreas(); loadBookings(); }
  };

  const upcoming = bookings.filter((b) => b.status !== "cancelado");
  const cancelled = bookings.filter((b) => b.status === "cancelado");

  return (
    <AppLayout>
      <div className="space-y-5 max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Áreas Comuns</h1>
            <p className="text-slate-500 text-sm mt-0.5">Gestão e reservas de espaços compartilhados</p>
          </div>
          <Button onClick={() => setAreaDialog(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4" /> Nova Área
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="areas">Áreas ({areas.length})</TabsTrigger>
            <TabsTrigger value="reservas">Reservas ({upcoming.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="areas" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : areas.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <CalendarDays className="h-12 w-12 text-slate-200 mb-4" />
                  <p className="text-slate-500">Nenhuma área comum cadastrada</p>
                  <Button className="mt-4 gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setAreaDialog(true)}>
                    <Plus className="h-4 w-4" /> Cadastrar Área
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {areas.map((area) => (
                  <Card key={area.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{area.name}</CardTitle>
                          {area.description && (
                            <CardDescription className="mt-1 line-clamp-2">{area.description}</CardDescription>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => openEditArea(area)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600"
                            onClick={() => handleDeleteArea(area.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                        {area.capacity && (
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-slate-400" />
                            <span>Até {area.capacity} pessoas</span>
                          </div>
                        )}
                        {area.openTime && area.closeTime && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>{area.openTime} – {area.closeTime}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                          <span>{area._count.bookings} reservas</span>
                        </div>
                      </div>

                      {area.bookings.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Próximas</p>
                          {area.bookings.slice(0, 3).map((b) => (
                            <div key={b.id} className="flex items-center justify-between text-xs bg-slate-50 rounded px-2 py-1.5">
                              <span className="font-medium">{b.residentName}</span>
                              <span className="text-slate-500">{formatDate(b.date)} · {b.startTime}–{b.endTime}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <Button className="w-full gap-2" variant="outline"
                        onClick={() => { setSelectedAreaId(area.id); setBookingDialog(true); }}>
                        <CalendarDays className="h-4 w-4" /> Fazer Reserva
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reservas" className="mt-4">
            {bookings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <List className="h-10 w-10 text-slate-200 mb-3" />
                  <p className="text-slate-400">Nenhuma reserva registrada</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {[...upcoming, ...cancelled].map((b) => {
                  const sc = bookingStatus[b.status] || bookingStatus.confirmado;
                  return (
                    <Card key={b.id} className={cn("hover:shadow-sm transition-shadow", b.status === "cancelado" && "opacity-60")}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-slate-900">{b.residentName}</p>
                              <Badge variant="outline" className="text-xs">Unid. {b.unitNumber}</Badge>
                              {b.commonArea && (
                                <Badge variant="secondary" className="text-xs">{b.commonArea.name}</Badge>
                              )}
                              <Badge className={`text-xs ${sc.color}`}>{sc.label}</Badge>
                            </div>
                            <p className="text-sm text-slate-500 mt-0.5">
                              {formatDate(b.date)} · {b.startTime} – {b.endTime}
                              {b.observation && ` · ${b.observation}`}
                            </p>
                          </div>
                          {b.status !== "cancelado" && (
                            <div className="flex gap-1 flex-shrink-0">
                              <Button size="sm" variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50 gap-1"
                                onClick={() => handleCancelBooking(b.id)}>
                                <XCircle className="h-3.5 w-3.5" /> Cancelar
                              </Button>
                            </div>
                          )}
                          {b.status === "cancelado" && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400"
                              onClick={() => handleDeleteBooking(b.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Area Dialog */}
      <Dialog open={areaDialog} onOpenChange={(v) => { setAreaDialog(v); if (!v) setEditingAreaId(null); }}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{editingAreaId ? "Editar Área" : "Nova Área Comum"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={areaForm.name} onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })} placeholder="Ex: Salão de Festas" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={areaForm.description} onChange={(e) => setAreaForm({ ...areaForm, description: e.target.value })} placeholder="Descreva a área..." rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Capacidade</Label>
                <Input type="number" value={areaForm.capacity} onChange={(e) => setAreaForm({ ...areaForm, capacity: e.target.value })} placeholder="50" />
              </div>
              <div className="space-y-2">
                <Label>Abertura</Label>
                <Input type="time" value={areaForm.openTime} onChange={(e) => setAreaForm({ ...areaForm, openTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fechamento</Label>
                <Input type="time" value={areaForm.closeTime} onChange={(e) => setAreaForm({ ...areaForm, closeTime: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Regras de Uso</Label>
              <Textarea value={areaForm.rules} onChange={(e) => setAreaForm({ ...areaForm, rules: e.target.value })} placeholder="Regras e normas de utilização..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAreaDialog(false); setEditingAreaId(null); }}>Cancelar</Button>
            <Button onClick={handleSaveArea} disabled={!areaForm.name} className="bg-blue-600 hover:bg-blue-700 text-white">
              {editingAreaId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking Dialog */}
      <Dialog open={bookingDialog} onOpenChange={setBookingDialog}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Nova Reserva</DialogTitle>
            {selectedAreaId && areas.find((a) => a.id === selectedAreaId) && (
              <p className="text-sm text-slate-500">{areas.find((a) => a.id === selectedAreaId)?.name}</p>
            )}
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Nome do Morador *</Label>
              <Input value={bookingForm.residentName} onChange={(e) => setBookingForm({ ...bookingForm, residentName: e.target.value })} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <Label>Unidade *</Label>
              <Input value={bookingForm.unitNumber} onChange={(e) => setBookingForm({ ...bookingForm, unitNumber: e.target.value })} placeholder="Ex: 301" />
            </div>
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" value={bookingForm.date} onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Início</Label>
              <Input type="time" value={bookingForm.startTime} onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Término</Label>
              <Input type="time" value={bookingForm.endTime} onChange={(e) => setBookingForm({ ...bookingForm, endTime: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Observação</Label>
              <Input value={bookingForm.observation} onChange={(e) => setBookingForm({ ...bookingForm, observation: e.target.value })} placeholder="Informações adicionais..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateBooking}
              disabled={!bookingForm.residentName || !bookingForm.unitNumber || !bookingForm.date}
              className="bg-blue-600 hover:bg-blue-700 text-white">
              Reservar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
