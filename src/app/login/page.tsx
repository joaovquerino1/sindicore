"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import {
  Eye, EyeOff, Loader2, Mail, Lock,
  ArrowRight, ShieldCheck, Sparkles, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/shared/brand-logo";
import { toast } from "sonner";

const DEMO_ACCOUNTS = [
  { role: "Administrador", email: "admin@sindicore.com",    color: "bg-violet-500/10 text-violet-300 border-violet-500/30" },
  { role: "Síndico",       email: "sindico@sindicore.com",  color: "bg-blue-500/10 text-blue-300 border-blue-500/30" },
  { role: "Porteiro",      email: "porteiro@sindicore.com", color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
];

const HIGHLIGHTS = [
  { icon: ShieldCheck, label: "Segurança JWT" },
  { icon: Users,       label: "Multi-condomínio" },
  { icon: Sparkles,    label: "Assembleias por vídeo" },
];

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setCurrentCondominiumId } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao fazer login");
        return;
      }
      setUser(data.user);
      if (data.user.condominiums?.length > 0) {
        setCurrentCondominiumId(data.user.condominiums[0].condominium.id);
      }
      toast.success(`Bem-vindo, ${data.user.name.split(" ")[0]}!`);
      router.push("/dashboard");
    } catch {
      toast.error("Erro ao conectar ao servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* ──────────────────────────────────────
          Painel esquerdo — branding (somente desktop)
      ────────────────────────────────────── */}
      <aside className="hidden lg:flex relative bg-gradient-mesh overflow-hidden">
        {/* Glow decorativo */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <BrandLogo size="md" byline tone="light" />

          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-xs font-medium text-violet-100">
              <Sparkles className="h-3.5 w-3.5 text-violet-300" />
              Plataforma completa de gestão
            </div>
            <h1 className="text-5xl font-bold leading-[1.12] tracking-tight">
              Seu condomínio, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-300">
                organizado de verdade.
              </span>
            </h1>
            <p className="text-lg text-violet-100/70 max-w-md leading-relaxed">
              Moradores, ocorrências, finanças, assembleias por vídeo e
              controle de portaria — tudo em um único sistema, em tempo real.
            </p>
          </div>

          <div className="space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm text-violet-100/75">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10">
                  <Icon className="h-4 w-4 text-violet-300" />
                </div>
                {label}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ──────────────────────────────────────
          Painel direito — formulário
      ────────────────────────────────────── */}
      <main className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo mobile */}
          <div className="flex lg:hidden mb-10">
            <BrandLogo size="md" byline />
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Bem-vindo de volta
            </h2>
            <p className="text-muted-foreground">
              Entre com suas credenciais para acessar o sistema.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  autoComplete="email"
                  className="pl-10 h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="current-password"
                  className="pl-10 pr-10 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium gap-2 bg-gradient-primary hover:opacity-95 transition-opacity"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-10 pt-6 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Contas de demonstração
            </p>
            <div className="grid grid-cols-1 gap-2">
              {DEMO_ACCOUNTS.map(({ role, email }) => (
                <button
                  key={email}
                  type="button"
                  onClick={() => setForm({ email, password: "admin123" })}
                  className="group flex items-center justify-between p-3 rounded-lg border border-border hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{role}</p>
                    <p className="text-xs text-muted-foreground font-mono">{email}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/70 mt-3 text-center">
              Senha para todas as contas: <code className="font-mono bg-muted px-1.5 py-0.5 rounded">admin123</code>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
