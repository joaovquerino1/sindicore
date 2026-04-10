import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const dbFilePath = dbUrl.replace(/^file:/, "");
const absoluteDbPath = path.isAbsolute(dbFilePath) ? dbFilePath : path.resolve(process.cwd(), dbFilePath);
const adapter = new PrismaBetterSqlite3({ url: `file:${absoluteDbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const password = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@sindicore.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@sindicore.com",
      password,
      role: "admin",
    },
  });

  const sindico = await prisma.user.upsert({
    where: { email: "sindico@sindicore.com" },
    update: {},
    create: {
      name: "Carlos Silva",
      email: "sindico@sindicore.com",
      password,
      role: "sindico",
      phone: "(11) 99999-1234",
    },
  });

  const porteiro = await prisma.user.upsert({
    where: { email: "porteiro@sindicore.com" },
    update: {},
    create: {
      name: "João Porteiro",
      email: "porteiro@sindicore.com",
      password,
      role: "porteiro",
      phone: "(11) 98888-5678",
    },
  });

  const condo = await prisma.condominium.upsert({
    where: { id: "condo-demo-001" },
    update: {},
    create: {
      id: "condo-demo-001",
      name: "Condomínio Jardim das Flores",
      cnpj: "12.345.678/0001-90",
      address: "Rua das Palmeiras, 100",
      city: "São Paulo",
      state: "SP",
      zipCode: "01234-567",
      phone: "(11) 3333-4444",
      email: "contato@jardimflores.com.br",
      users: {
        create: [
          { userId: admin.id, role: "admin" },
          { userId: sindico.id, role: "sindico" },
          { userId: porteiro.id, role: "porteiro" },
        ],
      },
    },
  });

  // Create Tower A
  const towerA = await prisma.tower.create({
    data: {
      condominiumId: condo.id,
      name: "Torre A",
      code: "A",
      order: 0,
    },
  });

  // Create Tower B
  const towerB = await prisma.tower.create({
    data: {
      condominiumId: condo.id,
      name: "Torre B",
      code: "B",
      order: 1,
    },
  });

  // Create floors and units for Tower A
  const unitStatuses = ["ocupado", "ocupado", "ocupado", "vago", "manutencao"];
  const floorNames = ["Térreo", "1º Andar", "2º Andar", "3º Andar", "4º Andar", "5º Andar"];

  for (let f = 0; f < 6; f++) {
    const floor = await prisma.floor.create({
      data: {
        towerId: towerA.id,
        name: floorNames[f],
        number: f,
        order: f,
      },
    });

    const unitsPerFloor = f === 0 ? 2 : 4;
    for (let u = 0; u < unitsPerFloor; u++) {
      const unitNum = f === 0 ? `${String.fromCharCode(65 + u)}` : `${f}0${u + 1}`;
      const status = unitStatuses[Math.floor(Math.random() * unitStatuses.length)];
      const unit = await prisma.unit.create({
        data: {
          floorId: floor.id,
          number: unitNum,
          type: f === 0 ? "garagem" : "apartamento",
          area: f === 0 ? 20 : 75 + Math.random() * 50,
          bedrooms: f === 0 ? null : 2 + Math.floor(Math.random() * 2),
          bathrooms: f === 0 ? null : 1 + Math.floor(Math.random() * 2),
          parking: f === 0 ? 0 : 1,
          status,
          order: u,
        },
      });

      if (status === "ocupado") {
        await prisma.resident.create({
          data: {
            unitId: unit.id,
            name: `Morador ${f}0${u + 1}`,
            phone: `(11) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
            email: `morador${f}${u + 1}@email.com`,
            type: Math.random() > 0.5 ? "proprietario" : "inquilino",
          },
        });
      }
    }
  }

  // Create floors and units for Tower B (3 floors)
  for (let f = 0; f < 4; f++) {
    const floor = await prisma.floor.create({
      data: {
        towerId: towerB.id,
        name: floorNames[f],
        number: f,
        order: f,
      },
    });

    for (let u = 0; u < 4; u++) {
      const unitNum = f === 0 ? `B-${String.fromCharCode(65 + u)}` : `B${f}0${u + 1}`;
      await prisma.unit.create({
        data: {
          floorId: floor.id,
          number: unitNum,
          type: f === 0 ? "garagem" : "apartamento",
          area: 65,
          bedrooms: f === 0 ? null : 2,
          parking: f === 0 ? 0 : 1,
          status: "ocupado",
          order: u,
        },
      });
    }
  }

  // Create some visitors
  const units = await prisma.unit.findMany({
    where: { floor: { tower: { condominiumId: condo.id } }, status: "ocupado" },
    take: 5,
  });

  const visitorStatuses = ["aguardando", "autorizado", "saiu", "saiu", "negado"];
  for (let i = 0; i < 5; i++) {
    await prisma.visitor.create({
      data: {
        unitId: units[i % units.length].id,
        name: `Visitante ${i + 1}`,
        document: `${Math.floor(100000000 + Math.random() * 900000000)}`,
        phone: `(11) 9${Math.floor(1000 + Math.random() * 9000)}-0000`,
        reason: ["Visita familiar", "Entrega", "Manutenção", "Serviço"][i % 4],
        status: visitorStatuses[i],
        entryAt: new Date(),
        ...(visitorStatuses[i] === "saiu" && { exitAt: new Date() }),
      },
    });
  }

  // Common areas
  await prisma.commonArea.createMany({
    data: [
      {
        condominiumId: condo.id,
        name: "Salão de Festas",
        description: "Salão completo com cozinha e área de lazer",
        capacity: 80,
        openTime: "08:00",
        closeTime: "23:00",
        rules: "Limpeza obrigatória após uso. Máximo 80 pessoas.",
      },
      {
        condominiumId: condo.id,
        name: "Churrasqueira",
        description: "2 churrasqueiras cobertas com mesas",
        capacity: 20,
        openTime: "10:00",
        closeTime: "22:00",
        rules: "Reserva com 48h de antecedência.",
      },
      {
        condominiumId: condo.id,
        name: "Piscina",
        description: "Piscina adulto e infantil",
        capacity: 30,
        openTime: "07:00",
        closeTime: "22:00",
        rules: "Uso de touca obrigatório.",
      },
      {
        condominiumId: condo.id,
        name: "Academia",
        description: "Academia equipada",
        capacity: 10,
        openTime: "06:00",
        closeTime: "23:00",
      },
      {
        condominiumId: condo.id,
        name: "Sala de Jogos",
        description: "Sinuca, pebolim e jogos de mesa",
        capacity: 15,
        openTime: "08:00",
        closeTime: "22:00",
      },
    ],
  });

  // Occurrences
  await prisma.occurrence.createMany({
    data: [
      {
        condominiumId: condo.id,
        userId: sindico.id,
        title: "Vazamento no 3º andar",
        description: "Morador reportou vazamento no banheiro do apartamento 301.",
        category: "vazamento",
        priority: "alta",
        status: "em_andamento",
        unitNumber: "301",
      },
      {
        condominiumId: condo.id,
        userId: porteiro.id,
        title: "Barulho excessivo - Apt 201",
        description: "Reclamação de barulho após as 22h.",
        category: "barulho",
        priority: "media",
        status: "aberto",
        unitNumber: "201",
      },
      {
        condominiumId: condo.id,
        userId: porteiro.id,
        title: "Lâmpada queimada - Corredor Torre B",
        description: "Corredor do 2º andar da Torre B com lâmpada queimada.",
        category: "manutencao",
        priority: "baixa",
        status: "aberto",
      },
      {
        condominiumId: condo.id,
        userId: sindico.id,
        title: "Portão da garagem com defeito",
        description: "Portão não abre completamente.",
        category: "manutencao",
        priority: "urgente",
        status: "em_andamento",
      },
      {
        condominiumId: condo.id,
        userId: porteiro.id,
        title: "Estacionamento irregular",
        description: "Veículo estacionado em vaga de visitante há 3 dias.",
        category: "seguranca",
        priority: "media",
        status: "resolvido",
        resolvedAt: new Date(),
      },
    ],
  });

  // Finances
  const now = new Date();
  await prisma.finance.createMany({
    data: [
      {
        condominiumId: condo.id,
        type: "receita",
        category: "condominio",
        description: "Taxa condominial - Março 2026",
        amount: 15200,
        dueDate: new Date(now.getFullYear(), now.getMonth(), 10),
        status: "pago",
        paidDate: new Date(now.getFullYear(), now.getMonth(), 8),
      },
      {
        condominiumId: condo.id,
        type: "despesa",
        category: "limpeza",
        description: "Serviço de limpeza - Março 2026",
        amount: 3200,
        dueDate: new Date(now.getFullYear(), now.getMonth(), 15),
        status: "pago",
        paidDate: new Date(now.getFullYear(), now.getMonth(), 14),
      },
      {
        condominiumId: condo.id,
        type: "despesa",
        category: "manutencao",
        description: "Manutenção elevadores",
        amount: 1800,
        dueDate: new Date(now.getFullYear(), now.getMonth(), 20),
        status: "pendente",
      },
      {
        condominiumId: condo.id,
        type: "despesa",
        category: "energia",
        description: "Conta de energia - Áreas comuns",
        amount: 2400,
        dueDate: new Date(now.getFullYear(), now.getMonth(), 25),
        status: "pendente",
      },
      {
        condominiumId: condo.id,
        type: "receita",
        category: "multa",
        description: "Multa - Barulho após horário",
        amount: 500,
        dueDate: new Date(now.getFullYear(), now.getMonth(), 30),
        status: "pendente",
      },
      {
        condominiumId: condo.id,
        type: "despesa",
        category: "seguranca",
        description: "Empresa de segurança - Abril 2026",
        amount: 4500,
        dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 10),
        status: "pendente",
      },
    ],
  });

  // Notices
  await prisma.notice.createMany({
    data: [
      {
        condominiumId: condo.id,
        title: "Assembleia Geral Ordinária",
        content: "Fica convocada Assembleia Geral Ordinária para o dia 15/04/2026 às 19h no Salão de Festas. Pauta: aprovação de contas 2025 e eleição de síndico.",
        category: "assembleia",
        priority: "importante",
        expiresAt: new Date("2026-04-15"),
      },
      {
        condominiumId: condo.id,
        title: "Manutenção Preventiva - Elevadores",
        content: "Informamos que na próxima segunda-feira (06/04) haverá manutenção preventiva nos elevadores das Torres A e B, das 8h às 12h.",
        category: "manutencao",
        priority: "importante",
        expiresAt: new Date("2026-04-06"),
      },
      {
        condominiumId: condo.id,
        title: "Regras de uso da Piscina",
        content: "Lembramos que o uso de touca é obrigatório. O acesso com crianças menores de 12 anos requer acompanhamento de adulto responsável.",
        category: "geral",
        priority: "normal",
      },
    ],
  });

  console.log("Seed completed!");
  console.log("Credentials:");
  console.log("Admin: admin@sindicore.com / admin123");
  console.log("Síndico: sindico@sindicore.com / admin123");
  console.log("Porteiro: porteiro@sindicore.com / admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
