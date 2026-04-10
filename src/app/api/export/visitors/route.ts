import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { buildCSV, buildXLSX, csvResponse, xlsxResponse } from "@/lib/export";

const HEADERS = [
  "Nome", "Documento", "Telefone", "Motivo", "Placa Veículo",
  "Status", "Unidade", "Torre", "Entrada", "Saída",
];

const STATUS_LABELS: Record<string, string> = {
  aguardando: "Aguardando",
  dentro: "No condomínio",
  saiu: "Saiu",
  negado: "Negado",
};

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const condominiumId = searchParams.get("condominiumId");
    const format = searchParams.get("format") || "csv";
    const status = searchParams.get("status");

    const visitors = await prisma.visitor.findMany({
      where: {
        ...(condominiumId && { unit: { floor: { tower: { condominiumId } } } }),
        ...(status && { status }),
      },
      include: { unit: { include: { floor: { include: { tower: true } } } } },
      orderBy: { createdAt: "desc" },
    });

    const rows = visitors.map((v) => [
      v.name,
      v.document ?? "",
      v.phone ?? "",
      v.reason ?? "",
      v.vehiclePlate ?? "",
      STATUS_LABELS[v.status] ?? v.status,
      v.unit.number,
      v.unit.floor.tower.name,
      v.entryAt ? v.entryAt.toLocaleString("pt-BR") : "",
      v.exitAt ? v.exitAt.toLocaleString("pt-BR") : "",
    ]);

    if (format === "xlsx") {
      return xlsxResponse(buildXLSX(HEADERS, rows, "Visitantes"), "visitantes.xlsx");
    }
    return csvResponse(buildCSV(HEADERS, rows), "visitantes.csv");
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
