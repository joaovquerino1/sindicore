import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const condominiumId = searchParams.get("condominiumId");

    if (!condominiumId) {
      return NextResponse.json(
        { error: "condominiumId é obrigatório" },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      units,
      totalResidents,
      visitorsToday,
      visitorsCurrently,
      openOccurrences,
      pendingFinances,
      recentVisitors,
      recentOccurrences,
      monthlyFinances,
    ] = await Promise.all([
      prisma.unit.findMany({
        where: { floor: { tower: { condominiumId } } },
        select: { status: true },
      }),
      prisma.resident.count({
        where: {
          active: true,
          unit: { floor: { tower: { condominiumId } } },
        },
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
          status: "dentro",
        },
      }),
      prisma.occurrence.count({
        where: {
          condominiumId,
          status: { in: ["aberto", "em_andamento"] },
        },
      }),
      prisma.finance.aggregate({
        where: {
          condominiumId,
          status: { in: ["pendente", "atrasado"] },
          type: "despesa",
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.visitor.findMany({
        where: { unit: { floor: { tower: { condominiumId } } } },
        include: { unit: { include: { floor: { include: { tower: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.occurrence.findMany({
        where: { condominiumId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.finance.findMany({
        where: { condominiumId },
        orderBy: { dueDate: "desc" },
        take: 6,
      }),
    ]);

    const totalUnits = units.length;
    const occupiedUnits = units.filter((u) => u.status === "ocupado").length;
    const vacantUnits = units.filter((u) => u.status === "vago").length;

    return NextResponse.json({
      stats: {
        totalUnits,
        occupiedUnits,
        vacantUnits,
        totalResidents,
        visitorsToday,
        visitorsCurrently,
        openOccurrences,
        pendingFinancesCount: pendingFinances._count,
        pendingFinancesAmount: pendingFinances._sum.amount || 0,
      },
      recentVisitors,
      recentOccurrences,
      monthlyFinances,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
