"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { AppLayout } from "@/components/layout/app-layout";
import { getInitials } from "@/lib/utils";
import {
  Settings, User, Building2, Lock, Shield, Plus, Pencil, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  sindico: "Síndico",
  porteiro: "Porteiro",
  morador: "Morador",
};

interface CondoForm {
  name: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
}

const emptyForm: CondoForm = {
  name: "", cnpj: "", address: "", city: "", state: "", zipCode: "", phone: "", email: "",
};

export default function ConfiguracoesPage() {
  const { user, setUser, currentCondominiumId, setCurrentCondominiumId } = useAppStore();
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [changingPassword, setChangingPassword] = useState(false);

  // Condominium dialog
  const [condoDialog, setCondoDialog] = useState(false);
  const [editingCondoId, setEditingCondoId] = useState<string | null>(null);
  const [condoForm, setCondoForm] = useState<CondoForm>(emptyForm);
  const [savingCondo, setSavingCondo] = useState(false);

  const refreshUser = async () => {
    const res = await fetch("/api/auth/me");
    if (res.ok) setUser(await res.json());
  };

  const openNewCondo = () => {
    setEditingCondoId(null);
    setCondoForm(emptyForm);
    setCondoDialog(true);
  };

  const openEditCondo = async (id: string) => {
    setEditingCondoId(id);
    setCondoForm(emptyForm);
    setCondoDialog(true);
    // Fetch full condominium data (store only keeps id/name/city/state)
    const res = await fetch(`/api/condominiums/${id}`);
    if (res.ok) {
      const c = await res.json();
      setCondoForm({
        name: c.name ?? "",
        cnpj: c.cnpj ?? "",
        address: c.address ?? "",
        city: c.city ?? "",
        state: c.state ?? "",
        zipCode: c.zipCode ?? "",
        phone: c.phone ?? "",
        email: c.email ?? "",
      });
    }
  };

  const handleSaveCondo = async () => {
    if (!condoForm.name.trim() || !condoForm.city.trim() || !condoForm.state.trim()) {
      toast.error("Nome, cidade e estado são obrigatórios");
      return;
    }
    setSavingCondo(true);
    try {
      let res: Response;
      if (editingCondoId) {
        res = await fetch(`/api/condominiums/${editingCondoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(condoForm),
        });
      } else {
        res = await fetch("/api/condominiums", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(condoForm),
        });
      }

      if (res.ok) {
        const condo = await res.json();
        toast.success(editingCondoId ? "Condomínio atualizado!" : "Condomínio criado!");
        setCondoDialog(false);
        await refreshUser();
        if (!editingCondoId) setCurrentCondominiumId(condo.id);
      } else {
        const err = await res.json();
        toast.error(err.error || "Erro ao salvar");
      }
    } finally {
      setSavingCondo(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (passwordForm.newPass.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.newPass }),
      });
      if (res.ok) {
        toast.success("Senha alterada com sucesso!");
        setPasswordForm({ current: "", newPass: "", confirm: "" });
      } else {
        const data = await res.json();
        toast.error(data.error || "Erro ao alterar senha");
      }
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gerencie seus condomínios, perfil e preferências</p>
        </div>

        {/* Profile Card */}
        {user && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Perfil do Usuário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-lg font-bold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{user.name}</h3>
                  <p className="text-slate-500 text-sm">{user.email}</p>
                  <Badge variant="secondary" className="mt-1">
                    {roleLabels[user.role] || user.role}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Condominiums */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Meus Condomínios
              </CardTitle>
              <Button size="sm" onClick={openNewCondo} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white h-8">
                <Plus className="h-3.5 w-3.5" /> Novo
              </Button>
            </div>
            <CardDescription>
              Síndicos profissionais podem gerenciar múltiplos condomínios
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!user?.condominiums?.length ? (
              <div className="text-center py-8">
                <Building2 className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                <p className="text-slate-400 text-sm mb-4">Nenhum condomínio cadastrado</p>
                <Button size="sm" onClick={openNewCondo} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4" /> Cadastrar primeiro condomínio
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {user.condominiums.map(({ condominium, role }) => {
                  const isActive = condominium.id === currentCondominiumId;
                  return (
                    <div
                      key={condominium.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isActive
                          ? "border-blue-200 bg-blue-50"
                          : "bg-slate-50 hover:bg-slate-100 cursor-pointer"
                      }`}
                      onClick={() => !isActive && setCurrentCondominiumId(condominium.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${isActive ? "bg-blue-600" : "bg-slate-200"}`}>
                          {isActive
                            ? <Check className="h-4 w-4 text-white" />
                            : <Building2 className="h-4 w-4 text-slate-500" />
                          }
                        </div>
                        <div>
                          <p className="font-medium text-sm text-slate-900">{condominium.name}</p>
                          <p className="text-xs text-slate-500">{condominium.city}, {condominium.state}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{roleLabels[role] || role}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); openEditCondo(condominium.id); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4" />
              Alterar Senha
            </CardTitle>
            <CardDescription>Recomendamos usar uma senha forte e única</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Senha Atual</Label>
              <Input
                type="password"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <Input
                type="password"
                value={passwordForm.newPass}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Nova Senha</Label>
              <Input
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !passwordForm.current || !passwordForm.newPass}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {changingPassword ? "Alterando..." : "Alterar Senha"}
            </Button>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Versão</span>
              <span className="font-medium">SindiCore v1.0.0</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span>Stack</span>
              <span className="font-medium">Next.js · Prisma · SQLite</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span>Ambiente</span>
              <span className="font-medium capitalize">{process.env.NODE_ENV || "development"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Condominium create/edit dialog */}
      <Dialog open={condoDialog} onOpenChange={setCondoDialog}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {editingCondoId ? "Editar Condomínio" : "Novo Condomínio"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Nome do Condomínio *</Label>
              <Input
                value={condoForm.name}
                onChange={(e) => setCondoForm({ ...condoForm, name: e.target.value })}
                placeholder="Ex: Residencial das Flores"
              />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input
                value={condoForm.cnpj}
                onChange={(e) => setCondoForm({ ...condoForm, cnpj: e.target.value })}
                placeholder="00.000.000/0001-00"
              />
            </div>
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input
                value={condoForm.zipCode}
                onChange={(e) => setCondoForm({ ...condoForm, zipCode: e.target.value })}
                placeholder="00000-000"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Endereço</Label>
              <Input
                value={condoForm.address}
                onChange={(e) => setCondoForm({ ...condoForm, address: e.target.value })}
                placeholder="Rua, número, bairro"
              />
            </div>
            <div className="space-y-2">
              <Label>Cidade *</Label>
              <Input
                value={condoForm.city}
                onChange={(e) => setCondoForm({ ...condoForm, city: e.target.value })}
                placeholder="São Paulo"
              />
            </div>
            <div className="space-y-2">
              <Label>Estado *</Label>
              <Input
                value={condoForm.state}
                onChange={(e) => setCondoForm({ ...condoForm, state: e.target.value })}
                placeholder="SP"
                maxLength={2}
                className="uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={condoForm.phone}
                onChange={(e) => setCondoForm({ ...condoForm, phone: e.target.value })}
                placeholder="(11) 3333-4444"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={condoForm.email}
                onChange={(e) => setCondoForm({ ...condoForm, email: e.target.value })}
                placeholder="contato@cond.com.br"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCondoDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleSaveCondo}
              disabled={savingCondo || !condoForm.name || !condoForm.city || !condoForm.state}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {savingCondo ? "Salvando..." : editingCondoId ? "Salvar" : "Criar Condomínio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
