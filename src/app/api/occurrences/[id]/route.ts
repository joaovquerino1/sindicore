import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const { id } = await params;
    const data = await req.json();
    const update: Record<string, unknown> = {};
    if (data.status) {
      update.status = data.status;
      if (data.status === "resolvido") update.resolvedAt = new Date();
    }
    if (data.title) update.title = data.title;
    if (data.description) update.description = data.description;
    if (data.category) update.category = data.category;
    if (data.priority) update.priority = data.priority;
    if (data.unitNumber !== undefined) update.unitNumber = data.unitNumber || null;
    const occurrence = await prisma.occurrence.update({ where: { id }, data: update });
    return NextResponse.json(occurrence);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const { id } = await params;
    await prisma.occurrence.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
