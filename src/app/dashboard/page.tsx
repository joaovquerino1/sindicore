"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/store/app-store";
import { AppLayout } from "@/components/layout/app-layout";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  Building2, Users, UserCheck, AlertTriangle,
  DollarSign, Clock, CheckCircle2, XCircle,
  ArrowRight, Home, Calendar, Bell, Car,
  TrendingUp, TrendingDown, Activity,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

// ============================================================
// Tipagens
// ============================================================

type DashboardData = {
  stats: {
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    maintenanceUnits: number;
    totalResidents: number;
    totalVehicles: number;
    visitorsToday: number;
    visitorsCurrently: number;
    openOccurrences: number;
    urgentOccurrences: number;
    highOccurrences: number;
    pendingFinancesAmount: number;
    overdueFinances: number;
    monthlyRevenue: number;
    activeNotices: number;
    occupancyRate: number;
  };
  recentVisitors: Array<{
    id: string; name: string; status: string; reason?: string;
    createdAt: string; unit?: { number: string };
  }>;
  recentOccurrences: Array<{
    id: string; title: string; priority: string; status: string;
    createdAt: string;
  }>;
  monthlyFinances: Array<{
    id: string; type: string; description: string; amount: number;
  }>;
  monthlyTrend: Array<{
    month: string; receitas: number; despesas: number; saldo: number;
  }>;
  upcomingAssemblies: Array<{
    id: string; title: string; type: string; scheduledAt: string; status: string;
  }>;
};

// ============================================================
// Configurações visuais
// ============================================================

const visitorStatusConfig: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  aguardando: { label: "Aguardando", bg: "bg-amber-50",  text: "text-amber-700",  icon: Clock },
  autorizado: { label: "Autorizado", bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle2 },
  negado:     { label: "Negado",     bg: "bg-red-50",    text: "text-red-700",    icon: XCircle },
  saiu:       { label: "Saiu",       bg: "bg-slate-100", text: "text-slate-600",  icon: ArrowRight },
};

const priorityConfig: Record<string, { label: string; bg: string; text: string; ring: string }> = {
  baixa:   { label: "Baixa",   bg: "bg-sky-50",     text: "text-sky-700",     ring: "ring-sky-200" },
  media:   { label: "Média",   bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200" },
  alta:    { label: "Alta",    bg: "bg-orange-50",  text: "text-orange-700",  ring: "ring-orange-200" },
  urgente: { label: "Urgente", bg: "bg-red-50",     text: "text-red-700",     ring: "ring-red-200" },
};

const PIE_COLORS = ["#2563eb", "#94a3b8", "#f59e0b"];

// ============================================================
// KPI Card
// ============================================================

function KpiCard({
  title, value, subtitle, icon: Icon, color, trend, href,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: "blue" | "emerald" | "violet" | "orange" | "rose";
  trend?: { value: number; label: string };
  href?: string;
}) {
  const colors = {
    blue:    { bg: "bg-blue-50",    text: "text-blue-600",    ring: "ring-blue-100",    accent: "from-blue-500/10 to-transparent" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-100", accent: "from-emerald-500/10 to-transparent" },
    violet:  { bg: "bg-violet-50",  text: "text-violet-600",  ring: "ring-violet-100",  accent: "from-violet-500/10 to-transparent" },
    orange:  { bg: "bg-orange-50",  text: "text-orange-600",  ring: "ring-orange-100",  accent: "from-orange-500/10 to-transparent" },
    rose:    { bg: "bg-rose-50",    text: "text-rose-600",    ring: "ring-rose-100",    accent: "from-rose-500/10 to-transparent" },
  }[color];

  const inner = (
    <Card className="relative overflow-hidden card-hover border-slate-200/70">
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.accent} pointer-events-none`} />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {title}
            </p>
            <p className="text-3xl font-bold text-slate-900 mt-2 leading-none tabular-nums">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-2">{subtitle}</p>
            )}
            {trend && (
              <div className={`inline-flex items-center gap-1 text-xs font-medium mt-2 ${
                trend.value >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}>
                {trend.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
              </div>
            )}
          </div>
          <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${colors.bg} ring-4 ${colors.ring} flex-shrink-0`}>
            <Icon className={`h-5 w-5 ${colors.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

// ============================================================
// Skeleton
// ============================================================

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <div className="h-3 skeleton w-20" />
              <div className="h-8 skeleton w-16" />
              <div className="h-3 skeleton w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card><CardContent className="p-5 h-64 skeleton" /></Card>
        <Card className="lg:col-span-2"><CardContent className="p-5 h-64 skeleton" /></Card>
      </div>
    </div>
  );
}

// ============================================================
// Página
// ============================================================

export default function DashboardPage() {
  const { currentCondominiumId, user } = useAppStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentCondominiumId) return;
    setLoading(true);
    fetch(`/api/dashboard?condominiumId=${currentCondominiumId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [currentCondominiumId]);

  if (!currentCondominiumId) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
            <Building2 className="h-10 w-10 text-slate-300" />
          </div>
          <h2 className="text-lg font-semibold text-slate-700">Nenhum condomínio selecionado</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            Selecione um condomínio no menu superior para visualizar o dashboard.
          </p>
        </div>
      </AppLayout>
    );
  }

  const stats = data?.stats;
  const occupancyData = stats
    ? [
        { name: "Ocupadas", value: stats.occupiedUnits },
        { name: "Vagas",    value: stats.vacantUnits },
        { name: "Manut.",   value: Math.max(0, stats.maintenanceUnits) },
      ].filter((d) => d.value > 0)
    : [];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in">
        {/* Header com saudação */}
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {greeting}{firstName && `, ${firstName}`} 👋
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Aqui está o panorama atualizado do seu condomínio.
            </p>
          </div>
          {stats && stats.urgentOccurrences > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium animate-pulse-soft">
              <AlertTriangle className="h-4 w-4" />
              {stats.urgentOccurrences} ocorrência{stats.urgentOccurrences > 1 ? "s" : ""} urgente{stats.urgentOccurrences > 1 ? "s" : ""}
            </div>
          )}
        </div>

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* KPI Row Principal */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Unidades"
                value={stats?.totalUnits ?? 0}
                subtitle={`${stats?.occupancyRate ?? 0}% de ocupação`}
                icon={Home} color="blue" href="/edificio"
              />
              <KpiCard
                title="Moradores"
                value={stats?.totalResidents ?? 0}
                subtitle={`${stats?.totalVehicles ?? 0} veículos cadastrados`}
                icon={Users} color="emerald" href="/moradores"
              />
              <KpiCard
                title="Visitantes Hoje"
                value={stats?.visitorsToday ?? 0}
                subtitle={`${stats?.visitorsCurrently ?? 0} no condomínio agora`}
                icon={UserCheck} color="violet" href="/visitantes"
              />
              <KpiCard
                title="Ocorrências"
                value={stats?.openOccurrences ?? 0}
                subtitle={`${stats?.highOccurrences ?? 0} alta · ${stats?.urgentOccurrences ?? 0} urgente`}
                icon={AlertTriangle} color="orange" href="/ocorrencias"
              />
            </div>

            {/* KPI Row Secundário */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-slate-200/70">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Receita do mês</p>
                    <p className="text-base font-bold text-slate-900 tabular-nums">
                      {formatCurrency(stats?.monthlyRevenue ?? 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-200/70">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Pendências</p>
                    <p className="text-base font-bold text-slate-900 tabular-nums">
                      {formatCurrency(stats?.pendingFinancesAmount ?? 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-200/70">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
                    <Bell className="h-4 w-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Avisos ativos</p>
                    <p className="text-base font-bold text-slate-900 tabular-nums">
                      {stats?.activeNotices ?? 0}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-200/70">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Car className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Veículos</p>
                    <p className="text-base font-bold text-slate-900 tabular-nums">
                      {stats?.totalVehicles ?? 0}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de tendência financeira */}
            <Card className="border-slate-200/70">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-600" />
                    Fluxo financeiro — Últimos 6 meses
                  </CardTitle>
                  <CardDescription>Evolução de receitas e despesas</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                  <Link href="/financeiro">Ver detalhes</Link>
                </Button>
              </CardHeader>
              <CardContent className="pt-2">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={data?.monthlyTrend ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                      tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      formatter={(value, name) => [
                        formatCurrency(Number(value)),
                        name === "receitas" ? "Receitas" : "Despesas",
                      ]}
                    />
                    <Area
                      type="monotone" dataKey="receitas" stroke="#10b981"
                      strokeWidth={2} fill="url(#colorReceitas)"
                    />
                    <Area
                      type="monotone" dataKey="despesas" stroke="#ef4444"
                      strokeWidth={2} fill="url(#colorDespesas)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Charts + Visitors */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Ocupação */}
              <Card className="border-slate-200/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">Ocupação</CardTitle>
                  <CardDescription>Distribuição de unidades</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={occupancyData} cx="50%" cy="50%"
                          innerRadius={48} outerRadius={72}
                          dataKey="value" paddingAngle={3}
                        >
                          {occupancyData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                          formatter={(v) => [`${v} unidades`]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Centro do donut */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-900">{stats?.occupancyRate ?? 0}%</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Ocupação</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center gap-4 mt-2">
                    {occupancyData.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PIE_COLORS[i] }} />
                        <span className="text-xs text-slate-600">
                          {item.name}: <strong className="tabular-nums">{item.value}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Visitantes recentes */}
              <Card className="lg:col-span-2 border-slate-200/70">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-700">Visitantes Recentes</CardTitle>
                    <CardDescription>Últimas entradas registradas</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                    <Link href="/visitantes">Ver todos</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {!data?.recentVisitors?.length ? (
                    <EmptyState icon={UserCheck} message="Nenhum visitante registrado" />
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {data.recentVisitors.map((v) => {
                        const sc = visitorStatusConfig[v.status] || visitorStatusConfig.aguardando;
                        const Icon = sc.icon;
                        return (
                          <div key={v.id} className="flex items-center justify-between py-2.5 gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-9 h-9 rounded-full ${sc.bg} flex items-center justify-center flex-shrink-0`}>
                                <Icon className={`h-4 w-4 ${sc.text}`} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{v.name}</p>
                                <p className="text-xs text-slate-500 truncate">
                                  {v.unit?.number ? `Ap. ${v.unit.number}` : "—"}
                                  {v.reason && ` · ${v.reason}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                                {sc.label}
                              </span>
                              <span className="text-xs text-slate-400 hidden sm:block tabular-nums">
                                {formatDateTime(v.createdAt)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Próximas assembleias */}
              <Card className="border-slate-200/70">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-700">Próximas Assembleias</CardTitle>
                    <CardDescription>Agendadas e em andamento</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                    <Link href="/assembleias">Ver tudo</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {!data?.upcomingAssemblies?.length ? (
                    <EmptyState icon={Calendar} message="Nenhuma assembleia agendada" />
                  ) : (
                    <div className="space-y-2.5">
                      {data.upcomingAssemblies.map((a) => (
                        <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Calendar className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{a.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {new Date(a.scheduledAt).toLocaleString("pt-BR", {
                                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Ocorrências recentes */}
              <Card className="border-slate-200/70">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-700">Ocorrências Recentes</CardTitle>
                    <CardDescription>Últimos chamados</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                    <Link href="/ocorrencias">Ver todas</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {!data?.recentOccurrences?.length ? (
                    <EmptyState icon={AlertTriangle} message="Nenhuma ocorrência" />
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {data.recentOccurrences.slice(0, 5).map((o) => {
                        const pc = priorityConfig[o.priority] || priorityConfig.media;
                        return (
                          <div key={o.id} className="flex items-center gap-3 py-2.5">
                            <div className="w-7 h-7 rounded-md bg-orange-50 flex items-center justify-center flex-shrink-0">
                              <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{o.title}</p>
                              <p className="text-xs text-slate-400 tabular-nums">{formatDateTime(o.createdAt)}</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${pc.bg} ${pc.text}`}>
                              {pc.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Financeiro */}
              <Card className="border-slate-200/70">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-700">Últimos Lançamentos</CardTitle>
                    <CardDescription>Movimentação financeira</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                    <Link href="/financeiro">Ver tudo</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {!data?.monthlyFinances?.length ? (
                    <EmptyState icon={DollarSign} message="Sem lançamentos" />
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {data.monthlyFinances.slice(0, 5).map((f) => (
                        <div key={f.id} className="flex items-center justify-between py-2.5 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-1 h-8 rounded-full flex-shrink-0 ${
                              f.type === "receita" ? "bg-emerald-500" : "bg-red-400"
                            }`} />
                            <span className="text-sm text-slate-700 truncate">{f.description}</span>
                          </div>
                          <span className={`text-sm font-semibold flex-shrink-0 tabular-nums ${
                            f.type === "receita" ? "text-emerald-600" : "text-red-500"
                          }`}>
                            {f.type === "receita" ? "+" : "−"}{formatCurrency(f.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

// ============================================================
// Empty state
// ============================================================

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icon className="h-8 w-8 text-slate-200 mb-2" />
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}
