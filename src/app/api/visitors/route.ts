import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const condominiumId = searchParams.get("condominiumId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const date = searchParams.get("date");

    let dateFilter = {};
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      dateFilter = { createdAt: { gte: start, lte: end } };
    }

    const visitors = await prisma.visitor.findMany({
      where: {
        ...(condominiumId && { unit: { floor: { tower: { condominiumId } } } }),
        ...(status && { status }),
        ...(search && {
          OR: [
            { name: { contains: search } },
            { document: { contains: search } },
            { vehiclePlate: { contains: search } },
          ],
        }),
        ...dateFilter,
      },
      include: {
        unit: { include: { floor: { include: { tower: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(visitors);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const data = await req.json();
    const visitor = await prisma.visitor.create({
      data: { ...data, entryAt: new Date() },
      include: { unit: { include: { floor: { include: { tower: true } } } } },
    });
    return NextResponse.json(visitor, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
