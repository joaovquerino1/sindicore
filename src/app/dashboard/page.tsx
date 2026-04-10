"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { AppLayout } from "@/components/layout/app-layout";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  Building2, Users, UserCheck, AlertTriangle,
  DollarSign, TrendingUp, Clock, CheckCircle2,
  XCircle, ArrowRight, Home, Wrench,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

function StatCard({
  title, value, subtitle, icon: Icon, bg, fg, href,
}: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ElementType; bg: string; fg: string; href?: string;
}) {
  const inner = (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1.5 leading-none">{value}</p>
            {subtitle && <p className="text-xs text-slate-400 mt-1.5">{subtitle}</p>}
          </div>
          <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${bg} flex-shrink-0 group-hover:scale-105 transition-transform`}>
            <Icon className={`h-5 w-5 ${fg}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

const visitorStatusConfig: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  aguardando: { label: "Aguardando", bg: "bg-amber-50",  text: "text-amber-700",  icon: Clock },
  autorizado: { label: "Autorizado", bg: "bg-green-50",  text: "text-green-700",  icon: CheckCircle2 },
  negado:     { label: "Negado",     bg: "bg-red-50",    text: "text-red-700",    icon: XCircle },
  saiu:       { label: "Saiu",       bg: "bg-slate-100", text: "text-slate-600",  icon: ArrowRight },
};

const priorityConfig: Record<string, { bg: string; text: string }> = {
  baixa:   { bg: "bg-sky-50",    text: "text-sky-700" },
  media:   { bg: "bg-amber-50",  text: "text-amber-700" },
  alta:    { bg: "bg-orange-50", text: "text-orange-700" },
  urgente: { bg: "bg-red-50",    text: "text-red-700" },
};

const PIE_COLORS = ["#2563eb", "#e2e8f0", "#f59e0b"];

export default function DashboardPage() {
  const { currentCondominiumId } = useAppStore();
  const [data, setData] = useState<any>(null);
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
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-700">Nenhum condomínio selecionado</h2>
          <p className="text-sm text-slate-500 mt-1">Selecione um condomínio no menu acima para continuar.</p>
        </div>
      </AppLayout>
    );
  }

  const stats = data?.stats;
  const maintenanceUnits = stats ? stats.totalUnits - stats.occupiedUnits - stats.vacantUnits : 0;
  const occupancyData = stats
    ? [
        { name: "Ocupadas", value: stats.occupiedUnits },
        { name: "Vagas",    value: stats.vacantUnits },
        { name: "Manut.",   value: Math.max(0, maintenanceUnits) },
      ].filter(d => d.value > 0)
    : [];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Visão geral do condomínio</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-5">
                <div className="animate-pulse space-y-3">
                  <div className="h-3 bg-slate-200 rounded w-20" />
                  <div className="h-8 bg-slate-200 rounded w-12" />
                  <div className="h-3 bg-slate-200 rounded w-16" />
                </div>
              </CardContent></Card>
            ))}
          </div>
        ) : (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total de Unidades" value={stats?.totalUnits ?? 0}
                subtitle={`${stats?.occupiedUnits ?? 0} ocupadas`}
                icon={Home} bg="bg-blue-100" fg="text-blue-600" href="/edificio" />
              <StatCard title="Moradores Ativos" value={stats?.totalResidents ?? 0}
                subtitle="cadastrados"
                icon={Users} bg="bg-emerald-100" fg="text-emerald-600" href="/moradores" />
              <StatCard title="Visitantes Hoje" value={stats?.visitorsToday ?? 0}
                subtitle={`${stats?.visitorsCurrently ?? 0} no momento`}
                icon={UserCheck} bg="bg-violet-100" fg="text-violet-600" href="/visitantes" />
              <StatCard title="Ocorrências Abertas" value={stats?.openOccurrences ?? 0}
                subtitle="em andamento"
                icon={AlertTriangle} bg="bg-orange-100" fg="text-orange-600" href="/ocorrencias" />
            </div>

            {/* Charts + Visitors */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Occupancy */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">Ocupação</CardTitle>
                  <CardDescription>Distribuição de unidades</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={occupancyData} cx="50%" cy="50%"
                        innerRadius={48} outerRadius={72}
                        dataKey="value" paddingAngle={3}>
                        {occupancyData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => [`${v} unidades`]}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-1">
                    {occupancyData.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PIE_COLORS[i] }} />
                        <span className="text-xs text-slate-600">{item.name}: <strong>{item.value}</strong></span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Visitors */}
              <Card className="lg:col-span-2">
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
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <UserCheck className="h-8 w-8 text-slate-200 mb-2" />
                      <p className="text-sm text-slate-400">Nenhum visitante hoje</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {data.recentVisitors.map((v: any) => {
                        const sc = visitorStatusConfig[v.status] || visitorStatusConfig.aguardando;
                        const Icon = sc.icon;
                        return (
                          <div key={v.id} className="flex items-center justify-between py-2.5 gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <UserCheck className="h-4 w-4 text-slate-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{v.name}</p>
                                <p className="text-xs text-slate-400 truncate">
                                  Apto {v.unit?.number} · {v.reason || "Visita"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                                <Icon className="h-3 w-3" />
                                {sc.label}
                              </span>
                              <span className="text-xs text-slate-400 hidden sm:block">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Recent Occurrences */}
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-700">Ocorrências Recentes</CardTitle>
                    <CardDescription>Últimos chamados abertos</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                    <Link href="/ocorrencias">Ver todas</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-slate-100">
                    {data?.recentOccurrences?.map((o: any) => {
                      const pc = priorityConfig[o.priority] || priorityConfig.media;
                      return (
                        <div key={o.id} className="flex items-center gap-3 py-2.5">
                          <div className="w-7 h-7 rounded-md bg-orange-50 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{o.title}</p>
                            <p className="text-xs text-slate-400">{formatDateTime(o.createdAt)}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${pc.bg} ${pc.text}`}>
                            {o.priority}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Financial */}
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-700">Financeiro</CardTitle>
                    <CardDescription>Resumo do mês</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                    <Link href="/financeiro">Ver tudo</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 border border-orange-100 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Despesas pendentes</p>
                      <p className="font-bold text-orange-700 text-lg leading-tight">
                        {formatCurrency(stats?.pendingFinancesAmount ?? 0)}
                      </p>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {data?.monthlyFinances?.slice(0, 4).map((f: any) => (
                      <div key={f.id} className="flex items-center justify-between py-2">
                        <span className="text-sm text-slate-600 truncate flex-1 pr-3">{f.description}</span>
                        <span className={`text-sm font-semibold flex-shrink-0 ${f.type === "receita" ? "text-emerald-600" : "text-red-500"}`}>
                          {f.type === "receita" ? "+" : "−"}{formatCurrency(f.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
