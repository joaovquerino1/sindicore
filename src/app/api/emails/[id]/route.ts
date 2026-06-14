import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    const data = await req.json();

    const existing = await prisma.email.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const allowed = ["isRead", "isStarred", "folder"] as const;
    const update: Record<string, unknown> = {};
    for (const k of allowed) if (k in data) update[k] = data[k];

    const updated = await prisma.email.update({
      where: { id },
      data: update,
      include: { attachments: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("emails PATCH", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.email.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    // Se já estiver na lixeira, remove de vez. Senão, move pra lixeira.
    if (existing.folder === "trash") {
      await prisma.email.delete({ where: { id } });
      return NextResponse.json({ deleted: true });
    } else {
      const moved = await prisma.email.update({ where: { id }, data: { folder: "trash" } });
      return NextResponse.json(moved);
    }
  } catch (e) {
    console.error("emails DELETE", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
