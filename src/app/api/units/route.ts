import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const floorId = searchParams.get("floorId");
    const condominiumId = searchParams.get("condominiumId");

    const units = await prisma.unit.findMany({
      where: {
        ...(floorId && { floorId }),
        ...(condominiumId && { floor: { tower: { condominiumId } } }),
      },
      include: {
        floor: { include: { tower: true } },
        residents: { where: { active: true } },
        _count: { select: { visitors: true } },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(units);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const data = await req.json();
    const unit = await prisma.unit.create({ data });
    return NextResponse.json(unit, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
