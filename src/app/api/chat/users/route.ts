import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const condominiumId = searchParams.get("condominiumId");
    if (!condominiumId) return NextResponse.json({ error: "condominiumId obrigatório" }, { status: 400 });

    // Lista usuários do mesmo condomínio (admin/sindico para chat profissional)
    const links = await prisma.condominiumUser.findMany({
      where: {
        condominiumId,
        userId: { not: user.id },
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, avatar: true } },
      },
      orderBy: { user: { name: "asc" } },
    });

    return NextResponse.json(links.map((l) => ({ ...l.user, condoRole: l.role })));
  } catch (e) {
    console.error("chat users GET", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
