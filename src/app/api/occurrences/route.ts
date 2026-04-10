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
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");

    const occurrences = await prisma.occurrence.findMany({
      where: {
        ...(condominiumId && { condominiumId }),
        ...(status && { status }),
        ...(category && { category }),
        ...(priority && { priority }),
      },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(occurrences);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const data = await req.json();
    if (!data.title || !data.description || !data.condominiumId) {
      return NextResponse.json({ error: "title, description e condominiumId são obrigatórios" }, { status: 400 });
    }
    const occurrence = await prisma.occurrence.create({
      data: {
        condominiumId: data.condominiumId,
        title: data.title,
        description: data.description,
        category: data.category || "geral",
        priority: data.priority || "media",
        unitNumber: data.unitNumber || null,
        userId: user.id,
      },
      include: { user: { select: { name: true } } },
    });
    return NextResponse.json(occurrence, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
