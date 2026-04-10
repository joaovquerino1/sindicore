import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { buildCSV, buildXLSX, csvResponse, xlsxResponse } from "@/lib/export";

const HEADERS = [
  "Título", "Descrição", "Categoria", "Prioridade", "Status",
  "Nº Unidade", "Registrado por", "Criado em", "Resolvido em",
];

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const condominiumId = searchParams.get("condominiumId");
    const format = searchParams.get("format") || "csv";
    const status = searchParams.get("status");

    const occurrences = await prisma.occurrence.findMany({
      where: {
        ...(condominiumId && { condominiumId }),
        ...(status && { status }),
      },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    const rows = occurrences.map((o) => [
      o.title,
      o.description,
      o.category,
      o.priority,
      o.status,
      o.unitNumber ?? "",
      o.user?.name ?? "",
      o.createdAt.toLocaleDateString("pt-BR"),
      o.resolvedAt ? o.resolvedAt.toLocaleDateString("pt-BR") : "",
    ]);

    if (format === "xlsx") {
      return xlsxResponse(buildXLSX(HEADERS, rows, "Ocorrências"), "ocorrencias.xlsx");
    }
    return csvResponse(buildCSV(HEADERS, rows), "ocorrencias.csv");
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
