import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const condominiumId = searchParams.get("condominiumId");

    const towers = await prisma.tower.findMany({
      where: { ...(condominiumId && { condominiumId }), active: true },
      include: {
        floors: {
          orderBy: { order: "asc" },
          include: {
            units: {
              orderBy: { order: "asc" },
              include: {
                _count: { select: { residents: { where: { active: true } } } },
              },
            },
          },
        },
        _count: { select: { floors: true } },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(towers);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const data = await req.json();
    const tower = await prisma.tower.create({ data });
    return NextResponse.json(tower, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
