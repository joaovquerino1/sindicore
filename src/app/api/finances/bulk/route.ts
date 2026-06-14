import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const data = await req.json();
    const {
      condominiumId,
      category = "condominio",
      description = "Cobrança mensal",
      amount,
      dueDate,
      type = "receita",
      onlyOccupied = true,
    } = data;

    if (!condominiumId || !amount || !dueDate) {
      return NextResponse.json(
        { error: "condominiumId, amount e dueDate são obrigatórios" },
        { status: 400 }
      );
    }

    const units = await prisma.unit.findMany({
      where: {
        floor: { tower: { condominiumId } },
        ...(onlyOccupied && { status: "ocupado" }),
      },
      select: { id: true, number: true },
    });

    if (units.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma unidade elegível encontrada" },
        { status: 400 }
      );
    }

    const due = new Date(dueDate);
    const value = parseFloat(amount);

    const created = await prisma.$transaction(
      units.map((u) =>
        prisma.finance.create({
          data: {
            condominiumId,
            type,
            category,
            description,
            amount: value,
            dueDate: due,
            unitNumber: u.number,
          },
        })
      )
    );

    return NextResponse.json(
      { count: created.length, finances: created },
      { status: 201 }
    );
  } catch (e) {
    console.error("bulk finances error", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
