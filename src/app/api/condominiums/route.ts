import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const condominiums = await prisma.condominium.findMany({
      where: {
        ...(user.role !== "admin" && {
          users: { some: { userId: user.id } },
        }),
        active: true,
      },
      include: {
        _count: {
          select: {
            towers: true,
            occurrences: { where: { status: { in: ["aberto", "em_andamento"] } } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(condominiums);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !["admin", "sindico"].includes(user.role)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const data = await req.json();
    const condominium = await prisma.condominium.create({
      data: {
        ...data,
        users: {
          create: { userId: user.id, role: "sindico" },
        },
      },
    });

    return NextResponse.json(condominium, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
