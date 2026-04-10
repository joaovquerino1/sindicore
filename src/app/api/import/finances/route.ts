import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseUpload } from "@/lib/export";

// Expected columns (0-indexed):
// 0: Tipo | 1: Categoria | 2: Descrição | 3: Valor | 4: Vencimento | 5: Nº Unidade | 6: Observação

const VALID_TYPES = ["receita", "despesa"];

function parseDate(raw: string): Date | null {
  // Accepts DD/MM/YYYY or YYYY-MM-DD
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("/");
    return new Date(`${y}-${m}-${d}`);
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const condominiumId = formData.get("condominiumId") as string | null;

    if (!file || !condominiumId) {
      return NextResponse.json({ error: "Arquivo e condominiumId são obrigatórios" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = parseUpload(buffer);

    if (rows.length < 2) {
      return NextResponse.json({ error: "Arquivo vazio ou sem dados" }, { status: 400 });
    }

    const created: string[] = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const typeRaw = String(row[0] ?? "").trim().toLowerCase();
      const category = String(row[1] ?? "").trim();
      const description = String(row[2] ?? "").trim();
      const amountRaw = String(row[3] ?? "").trim().replace(",", ".");
      const dueDateRaw = String(row[4] ?? "").trim();
      const unitNumber = String(row[5] ?? "").trim() || null;
      const observation = String(row[6] ?? "").trim() || null;

      if (!description) continue; // skip blank rows

      const type = VALID_TYPES.includes(typeRaw) ? typeRaw : "despesa";

      const amount = parseFloat(amountRaw);
      if (isNaN(amount) || amount <= 0) {
        errors.push({ row: i + 1, message: `"${description}": valor inválido "${row[3]}"` });
        continue;
      }

      const dueDate = parseDate(dueDateRaw);
      if (!dueDate) {
        errors.push({ row: i + 1, message: `"${description}": data de vencimento inválida "${row[4]}"` });
        continue;
      }

      try {
        const f = await prisma.finance.create({
          data: {
            condominiumId,
            type,
            category: category || "outros",
            description,
            amount,
            dueDate,
            unitNumber,
            observation,
          },
        });
        created.push(f.id);
      } catch {
        errors.push({ row: i + 1, message: `"${description}": erro ao criar registro` });
      }
    }

    return NextResponse.json({ created: created.length, errors });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
