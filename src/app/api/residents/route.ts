import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const condominiumId = searchParams.get("condominiumId");
    const unitId = searchParams.get("unitId");
    const search = searchParams.get("search");

    const residents = await prisma.resident.findMany({
      where: {
        active: true,
        ...(unitId && { unitId }),
        ...(condominiumId && { unit: { floor: { tower: { condominiumId } } } }),
        ...(search && {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
            { cpf: { contains: search } },
          ],
        }),
      },
      include: {
        unit: { include: { floor: { include: { tower: true } } } },
        vehicles: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(residents);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const data = await req.json();
    const { vehicles, ...residentData } = data;
    const resident = await prisma.resident.create({
      data: {
        ...residentData,
        ...(vehicles && {
          vehicles: { create: vehicles },
        }),
      },
      include: { vehicles: true },
    });
    return NextResponse.json(resident, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
