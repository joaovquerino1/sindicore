import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const commonAreaId = searchParams.get("commonAreaId");
    const condominiumId = searchParams.get("condominiumId");

    const bookings = await prisma.booking.findMany({
      where: {
        ...(commonAreaId && { commonAreaId }),
        ...(condominiumId && { commonArea: { condominiumId } }),
      },
      include: { commonArea: { select: { name: true } } },
      orderBy: { date: "asc" },
    });

    return NextResponse.json(bookings);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const data = await req.json();
    if (!data.commonAreaId || !data.residentName || !data.unitNumber || !data.date || !data.startTime || !data.endTime) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }
    const booking = await prisma.booking.create({
      data: {
        commonAreaId: data.commonAreaId,
        residentName: data.residentName,
        unitNumber: data.unitNumber,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        observation: data.observation || null,
      },
      include: { commonArea: { select: { name: true } } },
    });
    return NextResponse.json(booking, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
