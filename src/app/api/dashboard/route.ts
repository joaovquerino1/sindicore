import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, withAuth, errors } from "@/lib/api";

/**
 * Endpoint agregador do Dashboard.
 * Retorna estatísticas, listas recentes e séries mensais para gráficos.
 */
export const GET = withAuth(async ({ req }) => {
  const condominiumId = new URL(req.url).searchParams.get("condominiumId");
  if (!condominiumId) throw errors.badRequest("condominiumId é obrigatório");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Janela dos últimos 6 meses
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  const [
    units,
    totalResidents,
    totalVehicles,
    visitorsToday,
    visitorsCurrently,
    openOccurrences,
    occurrencesByPriority,
    pendingFinances,
    overdueFinances,
    paidFinancesMonth,
    recentVisitors,
    recentOccurrences,
    monthlyFinances,
    activeNotices,
    upcomingAssemblies,
    financesLast6Months,
  ] = await Promise.all([
    prisma.unit.findMany({
      where: { floor: { tower: { condominiumId } } },
      select: { status: true },
    }),
    prisma.resident.count({
      where: { active: true, unit: { floor: { tower: { condominiumId } } } },
    }),
    prisma.vehicle.count({
      where: { resident: { unit: { floor: { tower: { condominiumId } } } } },
    }),
    prisma.visitor.count({
      where: {
        unit: { floor: { tower: { condominiumId } } },
        createdAt: { gte: today, lt: tomorrow },
      },
    }),
    prisma.visitor.count({
      where: {
        unit: { floor: { tower: { condominiumId } } },
        status: { in: ["aguardando", "autorizado"] },
      },
    }),
    prisma.occurrence.count({
      where: {
        condominiumId,
        status: { in: ["aberto", "em_andamento"] },
      },
    }),
    prisma.occurrence.groupBy({
      by: ["priority"],
      where: {
        condominiumId,
        status: { in: ["aberto", "em_andamento"] },
      },
      _count: true,
    }),
    prisma.finance.aggregate({
      where: {
        condominiumId,
        status: { in: ["pendente", "atrasado"] },
        type: "despesa",
      },
      _sum: { amount: true }, _count: true,
    }),
    prisma.finance.count({
      where: {
        condominiumId,
        status: "atrasado",
      },
    }),
    prisma.finance.aggregate({
      where: {
        condominiumId,
        status: "pago",
        type: "receita",
        paidDate: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
      },
      _sum: { amount: true },
    }),
    prisma.visitor.findMany({
      where: { unit: { floor: { tower: { condominiumId } } } },
      include: { unit: { include: { floor: { include: { tower: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.occurrence.findMany({
      where: { condominiumId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.finance.findMany({
      where: { condominiumId },
      orderBy: { dueDate: "desc" },
      take: 6,
    }),
    prisma.notice.count({
      where: {
        condominiumId, active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
    }),
    prisma.assembly.findMany({
      where: {
        condominiumId,
        status: { in: ["agendada", "em_andamento"] },
        scheduledAt: { gte: today },
      },
      orderBy: { scheduledAt: "asc" },
      take: 3,
    }),
    prisma.finance.findMany({
      where: {
        condominiumId,
        dueDate: { gte: sixMonthsAgo },
      },
      select: { type: true, amount: true, dueDate: true, status: true },
    }),
  ]);

  const totalUnits = units.length;
  const occupiedUnits = units.filter((u) => u.status === "ocupado").length;
  const vacantUnits = units.filter((u) => u.status === "vago").length;
  const maintenanceUnits = totalUnits - occupiedUnits - vacantUnits;

  // Agrupa finanças por mês
  const monthsMap = new Map<string, { receitas: number; despesas: number; pagos: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthsMap.set(key, { receitas: 0, despesas: 0, pagos: 0 });
  }

  for (const f of financesLast6Months) {
    const d = new Date(f.dueDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const m = monthsMap.get(key);
    if (!m) continue;
    if (f.type === "receita") m.receitas += f.amount;
    else m.despesas += f.amount;
    if (f.status === "pago") m.pagos += f.amount;
  }

  const monthlyTrend = Array.from(monthsMap.entries()).map(([key, v]) => {
    const [y, m] = key.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return {
      month: date.toLocaleString("pt-BR", { month: "short" }),
      receitas: Math.round(v.receitas),
      despesas: Math.round(v.despesas),
      saldo: Math.round(v.receitas - v.despesas),
    };
  });

  // Prioridades de ocorrência (top urgentes/altas)
  const urgentOccurrences = occurrencesByPriority.reduce(
    (acc, p) => acc + (p.priority === "urgente" ? p._count : 0),
    0
  );
  const highOccurrences = occurrencesByPriority.reduce(
    (acc, p) => acc + (p.priority === "alta" ? p._count : 0),
    0
  );

  return ok({
    stats: {
      totalUnits, occupiedUnits, vacantUnits, maintenanceUnits,
      totalResidents, totalVehicles,
      visitorsToday, visitorsCurrently,
      openOccurrences, urgentOccurrences, highOccurrences,
      pendingFinancesCount: pendingFinances._count,
      pendingFinancesAmount: pendingFinances._sum.amount || 0,
      overdueFinances,
      monthlyRevenue: paidFinancesMonth._sum.amount || 0,
      activeNotices,
      occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
    },
    recentVisitors,
    recentOccurrences,
    monthlyFinances,
    monthlyTrend,
    upcomingAssemblies,
  });
});
