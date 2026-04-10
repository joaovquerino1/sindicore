import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const residentId = searchParams.get("residentId");
    const condominiumId = searchParams.get("condominiumId");

    const vehicles = await prisma.vehicle.findMany({
      where: {
        ...(residentId && { residentId }),
        ...(condominiumId && {
          resident: { unit: { floor: { tower: { condominiumId } } } },
        }),
      },
      include: {
        resident: { select: { name: true, unit: { select: { number: true } } } },
      },
      orderBy: { plate: "asc" },
    });

    return NextResponse.json(vehicles);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const data = await req.json();
    if (!data.residentId || !data.plate) {
      return NextResponse.json({ error: "residentId e plate são obrigatórios" }, { status: 400 });
    }
    const vehicle = await prisma.vehicle.create({
      data: {
        residentId: data.residentId,
        plate: data.plate.toUpperCase(),
        brand: data.brand || null,
        model: data.model || null,
        color: data.color || null,
      },
    });
    return NextResponse.json(vehicle, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Placa já cadastrada" }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
