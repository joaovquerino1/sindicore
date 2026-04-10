import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseUpload } from "@/lib/export";

// Expected columns (0-indexed):
// 0: Nome | 1: CPF | 2: Telefone | 3: E-mail | 4: Tipo | 5: Nº Unidade

const VALID_TYPES = ["proprietario", "inquilino", "dependente"];

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

    // Load all units for this condominium to resolve by number
    const units = await prisma.unit.findMany({
      where: { floor: { tower: { condominiumId } } },
      select: { id: true, number: true },
    });
    const unitByNumber = new Map(units.map((u) => [u.number.toLowerCase(), u.id]));

    const created: string[] = [];
    const errors: { row: number; message: string }[] = [];

    // Skip header row (index 0)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const name = String(row[0] ?? "").trim();
      const cpf = String(row[1] ?? "").trim();
      const phone = String(row[2] ?? "").trim();
      const email = String(row[3] ?? "").trim();
      const typeRaw = String(row[4] ?? "").trim().toLowerCase();
      const unitNumber = String(row[5] ?? "").trim().toLowerCase();

      if (!name) continue; // skip blank rows

      if (!phone) {
        errors.push({ row: i + 1, message: `"${name}": telefone é obrigatório` });
        continue;
      }

      const type = VALID_TYPES.includes(typeRaw) ? typeRaw : "proprietario";

      const unitId = unitByNumber.get(unitNumber);
      if (!unitId) {
        errors.push({ row: i + 1, message: `"${name}": unidade "${row[5]}" não encontrada` });
        continue;
      }

      try {
        const r = await prisma.resident.create({
          data: {
            name,
            cpf: cpf || null,
            phone,
            email: email || null,
            type,
            unitId,
          },
        });
        created.push(r.id);
      } catch {
        errors.push({ row: i + 1, message: `"${name}": erro ao criar registro` });
      }
    }

    return NextResponse.json({ created: created.length, errors });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
