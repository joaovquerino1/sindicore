import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const condominiumId = searchParams.get("condominiumId");

    const areas = await prisma.commonArea.findMany({
      where: { ...(condominiumId && { condominiumId }), active: true },
      include: {
        bookings: {
          where: { date: { gte: new Date() } },
          orderBy: { date: "asc" },
          take: 5,
        },
        _count: { select: { bookings: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(areas);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const data = await req.json();
    const area = await prisma.commonArea.create({ data });
    return NextResponse.json(area, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
