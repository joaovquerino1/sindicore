"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { AppLayout } from "@/components/layout/app-layout";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Building2,
  Plus,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Home,
  Loader2,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type UnitStatus = "ocupado" | "vago" | "manutencao";

interface Unit {
  id: string;
  number: string;
  type: string;
  status: UnitStatus;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  order: number;
  _count?: { residents: number };
}

interface Floor {
  id: string;
  name: string;
  number: number;
  order: number;
  units: Unit[];
}

interface Tower {
  id: string;
  name: string;
  code?: string;
  order: number;
  floors: Floor[];
}

const statusConfig: Record<UnitStatus, { label: string; color: string }> = {
  ocupado: { label: "Ocupado", color: "bg-green-100 text-green-700 border-green-200" },
  vago: { label: "Vago", color: "bg-slate-100 text-slate-600 border-slate-200" },
  manutencao: { label: "Manutenção", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
};

function UnitCard({ unit, onEdit, onDelete }: { unit: Unit; onEdit: (unit: Unit) => void; onDelete: (id: string) => void }) {
  const sc = statusConfig[unit.status];
  return (
    <div
      className={cn(
        "p-3 rounded-lg border-2 hover:shadow-md transition-all relative group",
        sc.color
      )}
    >
      <button
        className="absolute top-1 right-1 h-5 w-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-red-100 text-red-500"
        onClick={(e) => { e.stopPropagation(); onDelete(unit.id); }}
        title="Remover unidade"
      >
        <Trash2 className="h-3 w-3" />
      </button>
      <div className="flex items-center justify-between cursor-pointer" onClick={() => onEdit(unit)}>
        <span className="font-bold text-sm">{unit.number}</span>
        {unit._count?.residents !== undefined && unit._count.residents > 0 && (
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span className="text-xs">{unit._count.residents}</span>
          </div>
        )}
      </div>
      <p className="text-xs mt-0.5 capitalize cursor-pointer" onClick={() => onEdit(unit)}>{unit.type}</p>
      {unit.area && <p className="text-xs cursor-pointer" onClick={() => onEdit(unit)}>{unit.area}m²</p>}
    </div>
  );
}

function SortableFloorRow({
  floor,
  expanded,
  onToggle,
  onEditUnit,
  onAddUnit,
  onDeleteFloor,
  onDeleteUnit,
}: {
  floor: Floor;
  expanded: boolean;
  onToggle: () => void;
  onEditUnit: (unit: Unit) => void;
  onAddUnit: (floorId: string) => void;
  onDeleteFloor: (floorId: string) => void;
  onDeleteUnit: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: floor.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600">
          <GripVertical className="h-4 w-4" />
        </button>
        <button onClick={onToggle} className="flex items-center gap-2 flex-1">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
          <span className="font-medium text-sm">{floor.name}</span>
          <Badge variant="secondary" className="text-xs">
            {floor.units.length} unidades
          </Badge>
        </button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onAddUnit(floor.id)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-400 hover:text-red-600"
            onClick={() => onDeleteFloor(floor.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="p-4">
          {floor.units.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">
              Nenhuma unidade cadastrada.{" "}
              <button
                className="text-blue-500 hover:underline"
                onClick={() => onAddUnit(floor.id)}
              >
                Adicionar unidade
              </button>
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {floor.units.map((unit) => (
                <UnitCard key={unit.id} unit={unit} onEdit={onEditUnit} onDelete={onDeleteUnit} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EdificioPage() {
  const { currentCondominiumId } = useAppStore();
  const [towers, setTowers] = useState<Tower[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());
  const [activeTowerId, setActiveTowerId] = useState<string | null>(null);

  // Dialogs
  const [towerDialog, setTowerDialog] = useState(false);
  const [floorDialog, setFloorDialog] = useState(false);
  const [unitDialog, setUnitDialog] = useState(false);
  const [editingTower, setEditingTower] = useState<Tower | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [selectedTowerId, setSelectedTowerId] = useState<string>("");
  const [selectedFloorId, setSelectedFloorId] = useState<string>("");

  const [editingTowerId, setEditingTowerId] = useState<string | null>(null);
  const [towerForm, setTowerForm] = useState({ name: "", code: "" });
  const [floorForm, setFloorForm] = useState({ name: "", number: "0" });
  const [unitForm, setUnitForm] = useState({
    number: "",
    type: "apartamento",
    area: "",
    bedrooms: "",
    bathrooms: "",
    parking: "1",
    status: "ocupado" as UnitStatus,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    if (!currentCondominiumId) return;
    loadTowers();
  }, [currentCondominiumId]);

  const loadTowers = async () => {
    setLoading(true);
    const res = await fetch(`/api/towers?condominiumId=${currentCondominiumId}`);
    if (res.ok) {
      const data = await res.json();
      setTowers(data);
      // Auto-expand all floors
      const ids = new Set<string>();
      data.forEach((t: Tower) => t.floors.forEach((f) => ids.add(f.id)));
      setExpandedFloors(ids);
    }
    setLoading(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Find which tower these floors belong to
    for (const tower of towers) {
      const floorIds = tower.floors.map((f) => f.id);
      if (floorIds.includes(String(active.id)) && floorIds.includes(String(over.id))) {
        const oldIndex = floorIds.indexOf(String(active.id));
        const newIndex = floorIds.indexOf(String(over.id));
        const newFloors = arrayMove(tower.floors, oldIndex, newIndex).map((f, i) => ({
          ...f,
          order: i,
        }));

        setTowers((prev) =>
          prev.map((t) => (t.id === tower.id ? { ...t, floors: newFloors } : t))
        );

        // Persist order
        for (const floor of newFloors) {
          await fetch(`/api/floors/${floor.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order: floor.order }),
          });
        }
        break;
      }
    }
  };

  const handleSaveTower = async () => {
    let res: Response;
    if (editingTowerId) {
      res = await fetch(`/api/towers/${editingTowerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(towerForm),
      });
    } else {
      res = await fetch("/api/towers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...towerForm, condominiumId: currentCondominiumId }),
      });
    }
    if (res.ok) {
      toast.success(editingTowerId ? "Torre atualizada!" : "Torre criada!");
      setTowerDialog(false);
      setEditingTowerId(null);
      setTowerForm({ name: "", code: "" });
      loadTowers();
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm("Remover esta unidade?")) return;
    const res = await fetch(`/api/units/${unitId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Unidade removida!"); loadTowers(); }
  };

  const handleDeleteTower = async (towerId: string) => {
    if (!confirm("Tem certeza? Todos os andares e unidades serão removidos.")) return;
    const res = await fetch(`/api/towers/${towerId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Torre removida!");
      loadTowers();
    }
  };

  const handleCreateFloor = async () => {
    const res = await fetch("/api/floors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        towerId: selectedTowerId,
        name: floorForm.name,
        number: parseInt(floorForm.number),
        order: towers.find((t) => t.id === selectedTowerId)?.floors.length || 0,
      }),
    });
    if (res.ok) {
      toast.success("Andar adicionado!");
      setFloorDialog(false);
      setFloorForm({ name: "", number: "0" });
      loadTowers();
    }
  };

  const handleDeleteFloor = async (floorId: string) => {
    if (!confirm("Remover este andar e todas as suas unidades?")) return;
    const res = await fetch(`/api/floors/${floorId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Andar removido!");
      loadTowers();
    }
  };

  const handleSaveUnit = async () => {
    const payload = {
      ...unitForm,
      area: unitForm.area ? parseFloat(unitForm.area) : null,
      bedrooms: unitForm.bedrooms ? parseInt(unitForm.bedrooms) : null,
      bathrooms: unitForm.bathrooms ? parseInt(unitForm.bathrooms) : null,
      parking: parseInt(unitForm.parking) || 0,
    };

    if (editingUnit) {
      const res = await fetch(`/api/units/${editingUnit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) { toast.success("Unidade atualizada!"); }
    } else {
      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, floorId: selectedFloorId }),
      });
      if (res.ok) { toast.success("Unidade criada!"); }
    }

    setUnitDialog(false);
    setEditingUnit(null);
    loadTowers();
  };

  const openUnitDialog = (unit?: Unit, floorId?: string) => {
    if (unit) {
      setEditingUnit(unit);
      setUnitForm({
        number: unit.number,
        type: unit.type,
        area: unit.area?.toString() || "",
        bedrooms: unit.bedrooms?.toString() || "",
        bathrooms: unit.bathrooms?.toString() || "",
        parking: unit.parking?.toString() || "1",
        status: unit.status,
      });
    } else {
      setEditingUnit(null);
      setUnitForm({ number: "", type: "apartamento", area: "", bedrooms: "", bathrooms: "", parking: "1", status: "ocupado" });
      if (floorId) setSelectedFloorId(floorId);
    }
    setUnitDialog(true);
  };

  return (
    <AppLayout>
      <div className="space-y-5 max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Edifício</h1>
            <p className="text-slate-500 text-sm mt-0.5">Gerencie torres, andares e unidades com drag-and-drop</p>
          </div>
          <Button onClick={() => { setEditingTowerId(null); setTowerForm({ name: "", code: "" }); setTowerDialog(true); }} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4" />
            Nova Torre
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : towers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="h-16 w-16 text-slate-200 mb-4" />
              <h2 className="text-lg font-semibold text-slate-700">Nenhuma torre cadastrada</h2>
              <p className="text-slate-400 mt-1 mb-6">Comece adicionando a primeira torre do condomínio.</p>
              <Button onClick={() => { setEditingTowerId(null); setTowerForm({ name: "", code: "" }); setTowerDialog(true); }} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Torre
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {towers.map((tower) => (
              <Card key={tower.id} className="overflow-hidden">
                <CardHeader className="bg-slate-900 text-white py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-bold">
                        {tower.code || tower.name[0]}
                      </div>
                      <div>
                        <CardTitle className="text-white">{tower.name}</CardTitle>
                        <p className="text-slate-400 text-sm">
                          {tower.floors.length} andares ·{" "}
                          {tower.floors.reduce((sum, f) => sum + f.units.length, 0)} unidades
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-transparent text-white border-slate-600 hover:bg-slate-700"
                        onClick={() => {
                          setSelectedTowerId(tower.id);
                          const nextFloor = tower.floors.length + 1;
                          setFloorForm({ name: `${nextFloor}º Andar`, number: String(tower.floors.length) });
                          setFloorDialog(true);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Andar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-300 hover:bg-slate-700 hover:text-white"
                        onClick={() => {
                          setEditingTowerId(tower.id);
                          setTowerForm({ name: tower.name, code: tower.code ?? "" });
                          setTowerDialog(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:bg-red-900/20"
                        onClick={() => handleDeleteTower(tower.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={tower.floors.map((f) => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {tower.floors.length === 0 ? (
                          <p className="text-slate-400 text-sm text-center py-8">
                            Nenhum andar.{" "}
                            <button
                              className="text-blue-500 hover:underline"
                              onClick={() => {
                                setSelectedTowerId(tower.id);
                                setFloorDialog(true);
                              }}
                            >
                              Adicionar andar
                            </button>
                          </p>
                        ) : (
                          [...tower.floors]
                            .sort((a, b) => b.order - a.order)
                            .map((floor) => (
                              <SortableFloorRow
                                key={floor.id}
                                floor={floor}
                                expanded={expandedFloors.has(floor.id)}
                                onToggle={() => {
                                  setExpandedFloors((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(floor.id)) next.delete(floor.id);
                                    else next.add(floor.id);
                                    return next;
                                  });
                                }}
                                onEditUnit={(unit) => openUnitDialog(unit)}
                                onAddUnit={(floorId) => openUnitDialog(undefined, floorId)}
                                onDeleteFloor={handleDeleteFloor}
                                onDeleteUnit={handleDeleteUnit}
                              />
                            ))
                        )}
                      </div>
                    </SortableContext>
                  </DndContext>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Tower Dialog */}
      <Dialog open={towerDialog} onOpenChange={(v) => { setTowerDialog(v); if (!v) setEditingTowerId(null); }}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingTowerId ? "Editar Torre" : "Nova Torre"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Torre</Label>
              <Input
                placeholder="Ex: Torre A, Torre Principal"
                value={towerForm.name}
                onChange={(e) => setTowerForm({ ...towerForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Código (opcional)</Label>
              <Input
                placeholder="Ex: A, B, 1"
                value={towerForm.code}
                onChange={(e) => setTowerForm({ ...towerForm, code: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTowerDialog(false); setEditingTowerId(null); }}>Cancelar</Button>
            <Button onClick={handleSaveTower} disabled={!towerForm.name} className="bg-blue-600 hover:bg-blue-700 text-white">
              {editingTowerId ? "Salvar" : "Criar Torre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floor Dialog */}
      <Dialog open={floorDialog} onOpenChange={setFloorDialog}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Adicionar Andar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Andar</Label>
              <Input
                placeholder="Ex: Térreo, 1º Andar, Cobertura"
                value={floorForm.name}
                onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Número do Andar</Label>
              <Input
                type="number"
                placeholder="0"
                value={floorForm.number}
                onChange={(e) => setFloorForm({ ...floorForm, number: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFloorDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateFloor} disabled={!floorForm.name} className="bg-blue-600 hover:bg-blue-700 text-white">Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unit Dialog */}
      <Dialog open={unitDialog} onOpenChange={setUnitDialog}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingUnit ? "Editar Unidade" : "Nova Unidade"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Número/Identificação</Label>
              <Input
                placeholder="Ex: 101, A, Loja 01"
                value={unitForm.number}
                onChange={(e) => setUnitForm({ ...unitForm, number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={unitForm.type}
                onValueChange={(v) => setUnitForm({ ...unitForm, type: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartamento">Apartamento</SelectItem>
                  <SelectItem value="sala">Sala Comercial</SelectItem>
                  <SelectItem value="loja">Loja</SelectItem>
                  <SelectItem value="garagem">Garagem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={unitForm.status}
                onValueChange={(v) => setUnitForm({ ...unitForm, status: v as UnitStatus })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ocupado">Ocupado</SelectItem>
                  <SelectItem value="vago">Vago</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Área (m²)</Label>
              <Input
                type="number"
                placeholder="75"
                value={unitForm.area}
                onChange={(e) => setUnitForm({ ...unitForm, area: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Quartos</Label>
              <Input
                type="number"
                placeholder="2"
                value={unitForm.bedrooms}
                onChange={(e) => setUnitForm({ ...unitForm, bedrooms: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Banheiros</Label>
              <Input
                type="number"
                placeholder="1"
                value={unitForm.bathrooms}
                onChange={(e) => setUnitForm({ ...unitForm, bathrooms: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Vagas de Garagem</Label>
              <Input
                type="number"
                placeholder="1"
                value={unitForm.parking}
                onChange={(e) => setUnitForm({ ...unitForm, parking: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnitDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveUnit} disabled={!unitForm.number} className="bg-blue-600 hover:bg-blue-700 text-white">
              {editingUnit ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
