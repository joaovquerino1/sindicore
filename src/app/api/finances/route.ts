import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const condominiumId = searchParams.get("condominiumId");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const month = searchParams.get("month");

    let dateFilter = {};
    if (month) {
      const [year, m] = month.split("-").map(Number);
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 0, 23, 59, 59);
      dateFilter = { dueDate: { gte: start, lte: end } };
    }

    const finances = await prisma.finance.findMany({
      where: {
        ...(condominiumId && { condominiumId }),
        ...(type && { type }),
        ...(status && { status }),
        ...dateFilter,
      },
      orderBy: { dueDate: "desc" },
    });

    const summary = await prisma.finance.groupBy({
      by: ["type", "status"],
      where: { ...(condominiumId && { condominiumId }), ...dateFilter },
      _sum: { amount: true },
      _count: true,
    });

    return NextResponse.json({ finances, summary });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const data = await req.json();
    if (!data.description || !data.amount || !data.dueDate || !data.condominiumId) {
      return NextResponse.json({ error: "description, amount, dueDate e condominiumId são obrigatórios" }, { status: 400 });
    }
    const finance = await prisma.finance.create({
      data: {
        condominiumId: data.condominiumId,
        type: data.type || "despesa",
        category: data.category || "outros",
        description: data.description,
        amount: parseFloat(data.amount),
        dueDate: new Date(data.dueDate),
        unitNumber: data.unitNumber || null,
        observation: data.observation || null,
      },
    });
    return NextResponse.json(finance, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
