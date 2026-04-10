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
    if (data.status) update.status = data.status;
    if (data.status === "pago") update.paidDate = data.paidDate ? new Date(data.paidDate) : new Date();
    if (data.description) update.description = data.description;
    if (data.amount !== undefined) update.amount = parseFloat(data.amount);
    if (data.dueDate) update.dueDate = new Date(data.dueDate);
    if (data.category) update.category = data.category;
    if (data.type) update.type = data.type;
    if (data.unitNumber !== undefined) update.unitNumber = data.unitNumber || null;
    if (data.observation !== undefined) update.observation = data.observation || null;
    const finance = await prisma.finance.update({ where: { id }, data: update });
    return NextResponse.json(finance);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const { id } = await params;
    await prisma.finance.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
