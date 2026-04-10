import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { buildCSV, buildXLSX, csvResponse, xlsxResponse } from "@/lib/export";

const HEADERS = [
  "Tipo", "Categoria", "Descrição", "Valor (R$)", "Status",
  "Vencimento", "Pagamento", "Nº Unidade", "Observação",
];

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const condominiumId = searchParams.get("condominiumId");
    const format = searchParams.get("format") || "csv";
    const template = searchParams.get("template") === "true";
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    if (template) {
      const csv = buildCSV(
        HEADERS,
        [["receita", "taxa_condominio", "Taxa de condomínio - Apto 101", "850.00", "pendente", "05/04/2026", "", "101", ""]],
      );
      return csvResponse(csv, "template_financeiro.csv");
    }

    const finances = await prisma.finance.findMany({
      where: {
        ...(condominiumId && { condominiumId }),
        ...(type && { type }),
        ...(status && { status }),
      },
      orderBy: { dueDate: "desc" },
    });

    const rows = finances.map((f) => [
      f.type,
      f.category,
      f.description,
      f.amount.toFixed(2),
      f.status,
      f.dueDate.toLocaleDateString("pt-BR"),
      f.paidDate ? f.paidDate.toLocaleDateString("pt-BR") : "",
      f.unitNumber ?? "",
      f.observation ?? "",
    ]);

    if (format === "xlsx") {
      return xlsxResponse(buildXLSX(HEADERS, rows, "Financeiro"), "financeiro.xlsx");
    }
    return csvResponse(buildCSV(HEADERS, rows), "financeiro.csv");
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
