"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import { AppLayout } from "@/components/layout/app-layout";
import { getInitials } from "@/lib/utils";
import {
  Users, Plus, Search, Loader2, Phone, Mail, Car, Home, Pencil, Trash2, X, Upload,
  LayoutGrid, LayoutList,
} from "lucide-react";
import { ExportMenu } from "@/components/export-menu";
import { ImportModal } from "@/components/import-modal";
import { ViewSwitcher } from "@/components/shared/view-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface Vehicle { id: string; plate: string; brand?: string; model?: string; color?: string }
interface Resident {
  id: string; name: string; email?: string; phone: string; cpf?: string;
  type: string; active: boolean;
  unit: { id: string; number: string; floor: { tower: { name: string } } };
  vehicles: Vehicle[];
}

const typeConfig: Record<string, string> = {
  proprietario: "bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300",
  inquilino: "bg-purple-100 dark:bg-purple-500/15 text-purple-800 dark:text-purple-300",
  dependente: "bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300",
};
const typeLabels: Record<string, string> = {
  proprietario: "Proprietário", inquilino: "Inquilino", dependente: "Dependente",
};

export default function MoradoresPage() {
  const { currentCondominiumId } = useAppStore();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [units, setUnits] = useState<{ id: string; number: string; floor: { tower: { name: string } } }[]>([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", cpf: "", type: "proprietario", unitId: "" });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleForm, setVehicleForm] = useState({ plate: "", brand: "", model: "", color: "" });
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const loadResidents = useCallback(async () => {
    if (!currentCondominiumId) return;
    setLoading(true);
    const params = new URLSearchParams({ condominiumId: currentCondominiumId });
    if (search) params.append("search", search);
    const res = await fetch(`/api/residents?${params}`);
    if (res.ok) setResidents(await res.json());
    setLoading(false);
  }, [currentCondominiumId, search]);

  useEffect(() => { loadResidents(); }, [loadResidents]);

  useEffect(() => {
    if (!currentCondominiumId) return;
    fetch(`/api/units?condominiumId=${currentCondominiumId}`)
      .then((r) => r.json()).then(setUnits);
  }, [currentCondominiumId]);

  const openCreate = () => {
    setEditingResident(null);
    setForm({ name: "", email: "", phone: "", cpf: "", type: "proprietario", unitId: "" });
    setVehicles([]);
    setVehicleForm({ plate: "", brand: "", model: "", color: "" });
    setAddingVehicle(false);
    setDialog(true);
  };

  const openEdit = (r: Resident) => {
    setEditingResident(r);
    setForm({ name: r.name, email: r.email || "", phone: r.phone, cpf: r.cpf || "", type: r.type, unitId: r.unit.id });
    setVehicles(r.vehicles);
    setVehicleForm({ plate: "", brand: "", model: "", color: "" });
    setAddingVehicle(false);
    setDialog(true);
  };

  const handleSave = async () => {
    if (editingResident) {
      const res = await fetch(`/api/residents/${editingResident.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (res.ok) toast.success("Morador atualizado!");
      else toast.error("Erro ao atualizar morador");
    } else {
      const res = await fetch("/api/residents", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (res.ok) toast.success("Morador cadastrado!");
      else toast.error("Erro ao cadastrar morador");
    }
    setDialog(false);
    loadResidents();
  };

  const handleAddVehicle = async () => {
    if (!editingResident || !vehicleForm.plate.trim()) return;
    setSavingVehicle(true);
    const res = await fetch("/api/vehicles", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ residentId: editingResident.id, ...vehicleForm }),
    });
    if (res.ok) {
      const v = await res.json();
      setVehicles((prev) => [...prev, v]);
      setVehicleForm({ plate: "", brand: "", model: "", color: "" });
      setAddingVehicle(false);
      loadResidents();
      toast.success("Veículo adicionado!");
    } else {
      const err = await res.json();
      toast.error(err.error || "Erro ao adicionar veículo");
    }
    setSavingVehicle(false);
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    const res = await fetch(`/api/vehicles/${vehicleId}`, { method: "DELETE" });
    if (res.ok) {
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
      loadResidents();
      toast.success("Veículo removido!");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este morador?")) return;
    const res = await fetch(`/api/residents/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Morador removido!"); loadResidents(); }
  };

  return (
    <AppLayout>
      <div className="space-y-5 max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Moradores</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              {residents.length} morador{residents.length !== 1 ? "es" : ""} cadastrado{residents.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <ExportMenu
              resource="residents"
              params={currentCondominiumId ? { condominiumId: currentCondominiumId } : {}}
            />
            <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Importar
            </Button>
            <Button onClick={openCreate} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4" /> Novo Morador
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input className="pl-9" placeholder="Buscar por nome, email, CPF, telefone..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <ViewSwitcher
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: "grid", label: "Cards", icon: LayoutGrid },
              { value: "list", label: "Lista", icon: LayoutList },
            ]}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400 dark:text-slate-500" />
          </div>
        ) : residents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="h-12 w-12 text-slate-200 dark:text-slate-700 mb-4" />
              <p className="text-slate-500 dark:text-slate-400">Nenhum morador encontrado</p>
              <Button className="mt-4 gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Cadastrar Morador
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {residents.map((resident) => (
              <Card key={resident.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold">
                          {getInitials(resident.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{resident.name}</h3>
                        <Badge variant="secondary" className={`text-xs mt-0.5 ${typeConfig[resident.type]}`}>
                          {typeLabels[resident.type]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(resident)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 dark:text-red-300 hover:text-red-600 dark:hover:text-red-400"
                        onClick={() => handleDelete(resident.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <Home className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      <span>Apto {resident.unit.number} · {resident.unit.floor.tower.name}</span>
                    </div>
                    {resident.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        <span>{resident.phone}</span>
                      </div>
                    )}
                    {resident.email && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        <span className="truncate">{resident.email}</span>
                      </div>
                    )}
                    {resident.vehicles.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Car className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        <span>{resident.vehicles.map((v) => v.plate).join(", ")}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Morador</th>
                    <th className="text-left px-4 py-3 font-medium">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium">Unidade</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Telefone</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">E-mail</th>
                    <th className="text-left px-4 py-3 font-medium hidden xl:table-cell">Veículos</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {residents.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                              {getInitials(r.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={`text-xs ${typeConfig[r.type]}`}>
                          {typeLabels[r.type]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        Apto {r.unit.number}
                        <span className="text-slate-400 dark:text-slate-500 text-xs ml-1">· {r.unit.floor.tower.name}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 hidden md:table-cell">{r.phone || "—"}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 hidden lg:table-cell">
                        <span className="truncate block max-w-[220px]">{r.email || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 hidden xl:table-cell">
                        {r.vehicles.length > 0 ? r.vehicles.map((v) => v.plate).join(", ") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 dark:text-red-300 hover:text-red-600 dark:hover:text-red-400"
                            onClick={() => handleDelete(r.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <ImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        resource="residents"
        condominiumId={currentCondominiumId ?? ""}
        onSuccess={loadResidents}
      />

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingResident ? "Editar Morador" : "Novo Morador"}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="dados">
            <TabsList className="w-full">
              <TabsTrigger value="dados" className="flex-1">Dados Pessoais</TabsTrigger>
              <TabsTrigger value="veiculos" className="flex-1" disabled={!editingResident}>
                Veículos {editingResident && vehicles.length > 0 && `(${vehicles.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
                </div>
                <div className="space-y-2">
                  <Label>Telefone *</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-0000" />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proprietario">Proprietário</SelectItem>
                      <SelectItem value="inquilino">Inquilino</SelectItem>
                      <SelectItem value="dependente">Dependente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unidade *</Label>
                  <Select value={form.unitId} onValueChange={(v) => setForm({ ...form, unitId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.number} - {u.floor?.tower?.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={!form.name || !form.phone || !form.unitId}
                  className="bg-blue-600 hover:bg-blue-700 text-white">
                  {editingResident ? "Salvar" : "Cadastrar"}
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="veiculos" className="mt-4 space-y-3">
              {vehicles.length === 0 && !addingVehicle && (
                <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-4">Nenhum veículo cadastrado</p>
              )}

              {vehicles.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    <div>
                      <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{v.plate}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {[v.brand, v.model, v.color].filter(Boolean).join(" · ") || "Sem detalhes"}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 dark:text-red-300 hover:text-red-600 dark:hover:text-red-400"
                    onClick={() => handleDeleteVehicle(v.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}

              {addingVehicle ? (
                <div className="border rounded-lg p-3 space-y-3 bg-blue-50 dark:bg-blue-500/10">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Novo Veículo</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Placa *</Label>
                      <Input className="h-8 text-sm" placeholder="ABC-1234"
                        value={vehicleForm.plate} onChange={(e) => setVehicleForm({ ...vehicleForm, plate: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Marca</Label>
                      <Input className="h-8 text-sm" placeholder="Toyota"
                        value={vehicleForm.brand} onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Modelo</Label>
                      <Input className="h-8 text-sm" placeholder="Corolla"
                        value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Cor</Label>
                      <Input className="h-8 text-sm" placeholder="Prata"
                        value={vehicleForm.color} onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setAddingVehicle(false)}>Cancelar</Button>
                    <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={handleAddVehicle} disabled={!vehicleForm.plate.trim() || savingVehicle}>
                      {savingVehicle ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Adicionar"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="w-full gap-2" onClick={() => setAddingVehicle(true)}>
                  <Plus className="h-4 w-4" /> Adicionar Veículo
                </Button>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
