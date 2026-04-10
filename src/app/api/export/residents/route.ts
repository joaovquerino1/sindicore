import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { buildCSV, buildXLSX, csvResponse, xlsxResponse } from "@/lib/export";

const HEADERS = [
  "Nome", "CPF", "Telefone", "E-mail", "Tipo",
  "Unidade", "Torre", "Veículos (placas)", "Cadastrado em",
];

const TYPE_LABELS: Record<string, string> = {
  proprietario: "Proprietário",
  inquilino: "Inquilino",
  dependente: "Dependente",
};

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const condominiumId = searchParams.get("condominiumId");
    const format = searchParams.get("format") || "csv";
    const template = searchParams.get("template") === "true";

    if (template) {
      const csv = buildCSV(
        HEADERS,
        [["João Silva", "123.456.789-00", "(11) 99999-0000", "joao@email.com", "proprietario", "101", "Torre A", "", ""]],
      );
      return csvResponse(csv, "template_moradores.csv");
    }

    const residents = await prisma.resident.findMany({
      where: {
        active: true,
        ...(condominiumId && { unit: { floor: { tower: { condominiumId } } } }),
      },
      include: {
        unit: { include: { floor: { include: { tower: true } } } },
        vehicles: true,
      },
      orderBy: { name: "asc" },
    });

    const rows = residents.map((r) => [
      r.name,
      r.cpf ?? "",
      r.phone,
      r.email ?? "",
      TYPE_LABELS[r.type] ?? r.type,
      r.unit.number,
      r.unit.floor.tower.name,
      r.vehicles.map((v) => v.plate).join(", "),
      r.createdAt.toLocaleDateString("pt-BR"),
    ]);

    if (format === "xlsx") {
      return xlsxResponse(buildXLSX(HEADERS, rows, "Moradores"), "moradores.xlsx");
    }
    return csvResponse(buildCSV(HEADERS, rows), "moradores.csv");
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
