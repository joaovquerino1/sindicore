/**
 * Seed do banco SindiCore.
 *
 * Cria 3 condomínios de portes diferentes com dados realistas
 * espalhados ao longo do tempo, prontos para demonstração e teste.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

// ============================================================
// Setup
// ============================================================

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const dbFilePath = dbUrl.replace(/^file:/, "");
const absoluteDbPath = path.isAbsolute(dbFilePath)
  ? dbFilePath
  : path.resolve(process.cwd(), dbFilePath);
const adapter = new PrismaBetterSqlite3({ url: `file:${absoluteDbPath}` });
const prisma = new PrismaClient({ adapter });

// ============================================================
// Utilitários
// ============================================================

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function maybe(prob: number): boolean {
  return Math.random() < prob;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function daysFromNow(days: number): Date {
  return daysAgo(-days);
}

function randomCPF(): string {
  const n = (max: number) => Math.floor(Math.random() * max);
  return `${String(n(999)).padStart(3, "0")}.${String(n(999)).padStart(3, "0")}.${String(n(999)).padStart(3, "0")}-${String(n(99)).padStart(2, "0")}`;
}

function randomPhone(): string {
  return `(11) 9${randInt(1000, 9999)}-${randInt(1000, 9999)}`;
}

function randomPlate(): string {
  // Mercosul: 3 letras + 1 número + 1 letra + 2 números (ex: ABC1D23)
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const a = () => letters[randInt(0, 25)];
  return `${a()}${a()}${a()}${randInt(0, 9)}${a()}${randInt(0, 9)}${randInt(0, 9)}`;
}

function randomEmail(name: string, domain = "email.com"): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");
  return `${slug}${randInt(1, 99)}@${domain}`;
}

// ============================================================
// Listas de dados realistas
// ============================================================

const FIRST_NAMES = [
  "João", "Maria", "Pedro", "Ana", "Carlos", "Mariana", "Lucas", "Beatriz",
  "Rafael", "Juliana", "Bruno", "Camila", "Felipe", "Larissa", "Gabriel",
  "Amanda", "Thiago", "Patrícia", "Rodrigo", "Aline", "Eduardo", "Carolina",
  "Marcelo", "Fernanda", "André", "Letícia", "Fábio", "Paula", "Ricardo",
  "Renata", "Daniel", "Vanessa", "Henrique", "Bianca", "Leonardo", "Tatiana",
  "Vitor", "Priscila", "Gustavo", "Isabela", "Diego", "Natália", "Murilo",
  "Sabrina", "Caio", "Débora", "Igor", "Manuela",
];

const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Almeida",
  "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho",
  "Araújo", "Cardoso", "Barbosa", "Reis", "Mendes", "Cavalcanti", "Dias",
  "Castro", "Campos", "Cardim", "Marques", "Moraes", "Nascimento",
  "Nogueira", "Pinto", "Rocha", "Teixeira", "Vieira",
];

const VEHICLE_BRANDS = [
  { brand: "Volkswagen", models: ["Gol", "Polo", "Virtus", "T-Cross", "Nivus"] },
  { brand: "Fiat",       models: ["Mobi", "Argo", "Cronos", "Pulse", "Toro"] },
  { brand: "Chevrolet",  models: ["Onix", "Tracker", "Spin", "Cobalt", "S10"] },
  { brand: "Hyundai",    models: ["HB20", "Creta", "Tucson"] },
  { brand: "Toyota",     models: ["Corolla", "Yaris", "Hilux", "Etios"] },
  { brand: "Honda",      models: ["Civic", "City", "HR-V", "Fit"] },
  { brand: "Renault",    models: ["Kwid", "Sandero", "Duster", "Captur"] },
  { brand: "Ford",       models: ["Ka", "EcoSport"] },
  { brand: "Jeep",       models: ["Renegade", "Compass"] },
];

const VEHICLE_COLORS = [
  "Branco", "Prata", "Preto", "Cinza", "Vermelho", "Azul", "Vinho", "Bege",
];

const OCCURRENCE_TEMPLATES: Array<{
  title: string;
  description: string;
  category: string;
  priority: string;
}> = [
  {
    title: "Vazamento de água no banheiro",
    description: "Morador relatou vazamento na coluna do banheiro. Há indícios de infiltração no apartamento abaixo.",
    category: "vazamento", priority: "alta",
  },
  {
    title: "Barulho excessivo no período noturno",
    description: "Múltiplas reclamações de música alta após as 22h durante o final de semana.",
    category: "barulho", priority: "media",
  },
  {
    title: "Lâmpada queimada no corredor",
    description: "Lâmpada do corredor do andar precisa de substituição.",
    category: "manutencao", priority: "baixa",
  },
  {
    title: "Portão automático com defeito",
    description: "O portão da garagem não está fechando completamente, criando risco de invasão.",
    category: "seguranca", priority: "urgente",
  },
  {
    title: "Estacionamento em vaga indevida",
    description: "Veículo permanece estacionado em vaga de visitante há vários dias.",
    category: "seguranca", priority: "media",
  },
  {
    title: "Elevador com ruído anormal",
    description: "Elevador apresenta ruído metálico durante a subida acima do 5º andar.",
    category: "manutencao", priority: "alta",
  },
  {
    title: "Infiltração na garagem",
    description: "Após chuva forte, foi constatada infiltração no teto da garagem subterrânea.",
    category: "manutencao", priority: "alta",
  },
  {
    title: "Câmera de segurança offline",
    description: "Câmera do hall de entrada está sem sinal há 2 dias.",
    category: "seguranca", priority: "alta",
  },
  {
    title: "Problemas com interfone",
    description: "Interfone do apartamento não está chamando.",
    category: "manutencao", priority: "media",
  },
  {
    title: "Dejetos de animais não recolhidos",
    description: "Reclamação recorrente sobre fezes de cachorro em áreas comuns.",
    category: "geral", priority: "media",
  },
  {
    title: "Vazamento na piscina",
    description: "Nível da piscina cai rapidamente. Suspeita de vazamento na tubulação.",
    category: "vazamento", priority: "urgente",
  },
  {
    title: "Solicitação de poda de árvores",
    description: "Galhos das árvores do jardim estão atingindo as varandas.",
    category: "manutencao", priority: "baixa",
  },
  {
    title: "Mofo nas paredes do salão de festas",
    description: "Manchas de mofo aparecendo após a última chuva.",
    category: "manutencao", priority: "media",
  },
  {
    title: "Acesso indevido na academia",
    description: "Não-morador foi visto utilizando a academia.",
    category: "seguranca", priority: "alta",
  },
  {
    title: "Mau cheiro no lixo coletivo",
    description: "Lixeira do andar com forte odor.",
    category: "geral", priority: "baixa",
  },
];

const NOTICE_TEMPLATES: Array<{
  title: string;
  content: string;
  category: string;
  priority: string;
  expiresInDays?: number;
}> = [
  {
    title: "Convocação para Assembleia Geral Ordinária",
    content: "Fica convocada a Assembleia Geral Ordinária para deliberar sobre a aprovação das contas do exercício anterior, eleição do síndico e fixação da taxa condominial. A pauta detalhada está disponível na administração.",
    category: "assembleia", priority: "importante", expiresInDays: 21,
  },
  {
    title: "Manutenção Preventiva nos Elevadores",
    content: "Informamos que na próxima segunda-feira ocorrerá manutenção preventiva nos elevadores. O serviço será realizado das 8h às 12h. Pedimos desculpas pelo transtorno.",
    category: "manutencao", priority: "importante", expiresInDays: 7,
  },
  {
    title: "Novas Regras de Uso da Piscina",
    content: "A partir do próximo mês, será obrigatório o uso de touca para entrar na piscina. Crianças menores de 12 anos só podem utilizar a área com acompanhamento de um adulto responsável.",
    category: "geral", priority: "normal",
  },
  {
    title: "Coleta de Lixo Reciclável",
    content: "Lembramos a todos os moradores que a coleta seletiva de recicláveis ocorre às terças e sextas-feiras. Por favor, separem corretamente o material.",
    category: "geral", priority: "normal",
  },
  {
    title: "Suspensão temporária do fornecimento de água",
    content: "A SABESP informou que haverá suspensão programada do fornecimento de água na sexta-feira, das 9h às 16h, para manutenção da rede.",
    category: "manutencao", priority: "urgente", expiresInDays: 3,
  },
  {
    title: "Atualização da taxa condominial",
    content: "Conforme deliberado em última assembleia, a taxa condominial sofrerá reajuste de 7% a partir do próximo mês. Veja o demonstrativo completo no quadro de avisos.",
    category: "financeiro", priority: "importante", expiresInDays: 30,
  },
  {
    title: "Reforço na segurança noturna",
    content: "Após avaliação da empresa de segurança, foi instituído o ronda extra entre 0h e 6h. Qualquer comportamento suspeito deve ser comunicado imediatamente à portaria.",
    category: "seguranca", priority: "importante", expiresInDays: 14,
  },
  {
    title: "Café da manhã no Dia do Vizinho",
    content: "Convidamos todos os moradores para um café da manhã coletivo no salão de festas neste sábado, das 9h às 12h. Traga uma fruta para compartilhar!",
    category: "geral", priority: "normal", expiresInDays: 7,
  },
];

const VISITOR_NAMES = [
  "Marcos Antônio Pereira", "Joana D'Arc Silva", "Roberto Carlos Lima",
  "Sandra Helena Costa", "Wellington Souza", "Cristina Marques Reis",
  "Adriano Borges", "Mônica Tavares", "Vinícius Resende", "Sílvia Rossi",
];

const VISITOR_REASONS = [
  "Visita familiar", "Entrega Mercado Livre", "Entrega iFood",
  "Manutenção elétrica", "Visita técnica internet", "Diarista",
  "Pet sitter", "Aula particular", "Limpeza pós-obra", "Mudança",
];

const FINANCE_TEMPLATES = {
  receitas: [
    { category: "condominio", description: "Taxa condominial", amount: () => randInt(380, 850) },
    { category: "multa",      description: "Multa por barulho",  amount: () => randInt(150, 500) },
    { category: "multa",      description: "Multa por uso indevido de área comum", amount: () => randInt(200, 600) },
    { category: "outros",     description: "Reserva de salão de festas", amount: () => randInt(180, 350) },
    { category: "outros",     description: "Aluguel de espaço comercial", amount: () => randInt(800, 2200) },
  ],
  despesas: [
    { category: "limpeza",     description: "Empresa de limpeza", amount: () => randInt(2800, 4200) },
    { category: "manutencao",  description: "Manutenção dos elevadores", amount: () => randInt(1200, 2400) },
    { category: "manutencao",  description: "Reparos hidráulicos", amount: () => randInt(400, 1500) },
    { category: "manutencao",  description: "Pintura da fachada", amount: () => randInt(3500, 9000) },
    { category: "energia",     description: "Conta de luz - áreas comuns", amount: () => randInt(1800, 3400) },
    { category: "agua",        description: "Conta de água", amount: () => randInt(2200, 4800) },
    { category: "seguro",      description: "Seguro do condomínio", amount: () => randInt(900, 1500) },
    { category: "seguranca",   description: "Empresa de segurança 24h", amount: () => randInt(4500, 7800) },
    { category: "funcionarios", description: "Folha de pagamento - zelador", amount: () => randInt(2200, 3500) },
    { category: "funcionarios", description: "Folha de pagamento - porteiros", amount: () => randInt(4800, 8200) },
    { category: "outros",      description: "Material de limpeza",   amount: () => randInt(180, 600) },
    { category: "outros",      description: "Jardinagem mensal",     amount: () => randInt(450, 950) },
  ],
};

// ============================================================
// Geradores
// ============================================================

function fullName(): string {
  return `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)} ${rand(LAST_NAMES)}`;
}

function vehicleData() {
  const v = rand(VEHICLE_BRANDS);
  return {
    plate: randomPlate(),
    brand: v.brand,
    model: rand(v.models),
    color: rand(VEHICLE_COLORS),
    year: randInt(2015, 2025),
  };
}

// ============================================================
// Configuração dos condomínios
// ============================================================

interface CondoConfig {
  id: string;
  name: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  towers: Array<{ name: string; code: string; floors: number; unitsPerFloor: number }>;
}

const CONDOMINIUMS: CondoConfig[] = [
  {
    id: "condo-jardim-flores",
    name: "Residencial Jardim das Flores",
    cnpj: "12.345.678/0001-90",
    address: "Rua das Palmeiras, 100",
    city: "São Paulo", state: "SP", zipCode: "01234-567",
    phone: "(11) 3333-4444", email: "contato@jardimflores.com.br",
    towers: [
      { name: "Torre A", code: "A", floors: 8, unitsPerFloor: 4 },
      { name: "Torre B", code: "B", floors: 8, unitsPerFloor: 4 },
      { name: "Torre C", code: "C", floors: 6, unitsPerFloor: 4 },
    ],
  },
  {
    id: "condo-vista-verde",
    name: "Edifício Vista Verde",
    cnpj: "98.765.432/0001-10",
    address: "Av. Brigadeiro Faria Lima, 2500",
    city: "São Paulo", state: "SP", zipCode: "01451-001",
    phone: "(11) 3555-7700", email: "admin@vistaverde.com.br",
    towers: [
      { name: "Edifício Único", code: "U", floors: 12, unitsPerFloor: 2 },
    ],
  },
  {
    id: "condo-parque-real",
    name: "Condomínio Parque Real",
    cnpj: "55.444.333/0001-22",
    address: "Estrada do Campo Limpo, 8000",
    city: "São Paulo", state: "SP", zipCode: "05779-000",
    phone: "(11) 3777-9900", email: "sindico@parquereal.com.br",
    towers: [
      { name: "Torre Norte",  code: "N", floors: 10, unitsPerFloor: 6 },
      { name: "Torre Sul",    code: "S", floors: 10, unitsPerFloor: 6 },
      { name: "Torre Leste",  code: "L", floors: 8,  unitsPerFloor: 4 },
      { name: "Torre Oeste",  code: "O", floors: 8,  unitsPerFloor: 4 },
    ],
  },
];

// ============================================================
// Main seed
// ============================================================

async function clean() {
  console.log("🧹 Limpando dados antigos...");
  // Ordem importa: filhos antes dos pais
  await prisma.booking.deleteMany();
  await prisma.commonArea.deleteMany();
  await prisma.assembly.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.finance.deleteMany();
  await prisma.occurrence.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.visitor.deleteMany();
  await prisma.resident.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.tower.deleteMany();
  await prisma.condominiumUser.deleteMany();
  await prisma.condominium.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log("🌱 Iniciando seed do SindiCore...\n");

  await clean();

  const password = await bcrypt.hash("admin123", 12);

  // ============================================================
  // Usuários
  // ============================================================
  console.log("👤 Criando usuários...");
  const admin = await prisma.user.create({
    data: { name: "Administrador",  email: "admin@sindicore.com",  password, role: "admin" },
  });
  const sindico = await prisma.user.create({
    data: { name: "Carlos Eduardo Silva", email: "sindico@sindicore.com", password, role: "sindico", phone: "(11) 99999-1234" },
  });
  const porteiro = await prisma.user.create({
    data: { name: "João Almeida Santos", email: "porteiro@sindicore.com", password, role: "porteiro", phone: "(11) 98888-5678" },
  });
  const sindico2 = await prisma.user.create({
    data: { name: "Patrícia Mendes Oliveira", email: "patricia@sindicore.com", password, role: "sindico", phone: "(11) 97777-1010" },
  });

  // ============================================================
  // Condomínios + Estrutura
  // ============================================================
  let totalUnits = 0;
  let totalResidents = 0;

  for (const config of CONDOMINIUMS) {
    console.log(`\n🏢 Condomínio: ${config.name}`);

    const condo = await prisma.condominium.create({
      data: {
        id: config.id,
        name: config.name, cnpj: config.cnpj,
        address: config.address, city: config.city, state: config.state,
        zipCode: config.zipCode, phone: config.phone, email: config.email,
        users: {
          create: [
            { userId: admin.id, role: "admin" },
            { userId: sindico.id, role: "sindico" },
            { userId: porteiro.id, role: "porteiro" },
            ...(config.id === "condo-vista-verde" ? [{ userId: sindico2.id, role: "sindico" }] : []),
          ],
        },
      },
    });

    // Torres + Andares + Unidades
    for (const [tIdx, towerCfg] of config.towers.entries()) {
      const tower = await prisma.tower.create({
        data: { condominiumId: condo.id, name: towerCfg.name, code: towerCfg.code, order: tIdx },
      });

      for (let f = 0; f < towerCfg.floors; f++) {
        const floor = await prisma.floor.create({
          data: {
            towerId: tower.id,
            name: f === 0 ? "Térreo" : `${f}º Andar`,
            number: f, order: f,
          },
        });

        const isGround = f === 0;
        const count = isGround ? Math.min(2, towerCfg.unitsPerFloor) : towerCfg.unitsPerFloor;

        for (let u = 0; u < count; u++) {
          const unitNum = isGround
            ? `${towerCfg.code}-${String.fromCharCode(65 + u)}`
            : `${towerCfg.code}${f}0${u + 1}`;

          // 75% ocupado, 18% vago, 7% manutenção
          const r = Math.random();
          const status = r < 0.75 ? "ocupado" : r < 0.93 ? "vago" : "manutencao";

          const unit = await prisma.unit.create({
            data: {
              floorId: floor.id, number: unitNum,
              type: isGround ? "garagem" : "apartamento",
              area: isGround ? 18 : Math.round(60 + Math.random() * 80),
              bedrooms: isGround ? null : randInt(1, 4),
              bathrooms: isGround ? null : randInt(1, 3),
              parking: isGround ? 0 : randInt(1, 2),
              status, order: u,
            },
          });
          totalUnits++;

          // Moradores
          if (status === "ocupado" && !isGround) {
            const numResidents = maybe(0.6) ? 2 : maybe(0.5) ? 3 : 1;
            for (let i = 0; i < numResidents; i++) {
              const name = fullName();
              const isMain = i === 0;
              const resident = await prisma.resident.create({
                data: {
                  unitId: unit.id, name,
                  cpf: maybe(0.85) ? randomCPF() : null,
                  email: maybe(0.7) ? randomEmail(name) : null,
                  phone: randomPhone(),
                  birthDate: new Date(randInt(1955, 2010), randInt(0, 11), randInt(1, 28)),
                  type: isMain
                    ? (maybe(0.7) ? "proprietario" : "inquilino")
                    : "dependente",
                },
              });
              totalResidents++;

              // Veículos: maioria dos titulares tem 1 carro, alguns têm 2
              if (isMain && maybe(0.85)) {
                await prisma.vehicle.create({
                  data: { residentId: resident.id, ...vehicleData() },
                });
                if (maybe(0.25)) {
                  await prisma.vehicle.create({
                    data: { residentId: resident.id, ...vehicleData() },
                  });
                }
              }
            }
          }
        }
      }
    }

    // ============================================================
    // Áreas comuns
    // ============================================================
    await prisma.commonArea.createMany({
      data: [
        { condominiumId: condo.id, name: "Salão de Festas", description: "Salão completo com cozinha, mesa de buffet e bar.", capacity: 80, openTime: "08:00", closeTime: "23:00", rules: "Limpeza obrigatória após uso. Reserva mediante taxa." },
        { condominiumId: condo.id, name: "Churrasqueira",   description: "Espaço com 2 churrasqueiras cobertas e 6 mesas.", capacity: 25, openTime: "10:00", closeTime: "22:00", rules: "Reserva com 48h de antecedência." },
        { condominiumId: condo.id, name: "Piscina Adulto",  description: "Piscina aquecida 25m com raia.", capacity: 30, openTime: "07:00", closeTime: "22:00", rules: "Touca obrigatória. Sem comida na área molhada." },
        { condominiumId: condo.id, name: "Piscina Infantil", description: "Piscina rasa com brinquedos.", capacity: 15, openTime: "08:00", closeTime: "20:00", rules: "Crianças sempre acompanhadas de adulto." },
        { condominiumId: condo.id, name: "Academia",        description: "Academia com equipamentos de musculação e cardio.", capacity: 12, openTime: "06:00", closeTime: "23:00", rules: "Uso restrito a maiores de 16 anos." },
        { condominiumId: condo.id, name: "Sala de Jogos",   description: "Sinuca, pebolim, tênis de mesa.", capacity: 15, openTime: "08:00", closeTime: "22:00" },
        { condominiumId: condo.id, name: "Playground",      description: "Área de brincar com escorregador, balanço e gangorra.", capacity: 20, openTime: "07:00", closeTime: "20:00" },
        { condominiumId: condo.id, name: "Coworking",       description: "Espaço de trabalho com Wi-Fi, mesas e cadeiras ergonômicas.", capacity: 10, openTime: "06:00", closeTime: "23:59", rules: "Silêncio absoluto. Reserva por hora." },
      ],
    });

    // ============================================================
    // Ocorrências espalhadas pelos últimos 6 meses
    // ============================================================
    const occCount = randInt(15, 30);
    const occUsers = [sindico.id, porteiro.id];
    for (let i = 0; i < occCount; i++) {
      const t = rand(OCCURRENCE_TEMPLATES);
      const created = daysAgo(randInt(0, 180));
      const isOld = created.getTime() < daysAgo(30).getTime();
      // ocorrências antigas tendem a estar resolvidas
      const status = isOld
        ? (maybe(0.85) ? "resolvido" : maybe(0.5) ? "cancelado" : "em_andamento")
        : (maybe(0.4) ? "aberto" : maybe(0.6) ? "em_andamento" : "resolvido");

      await prisma.occurrence.create({
        data: {
          condominiumId: condo.id, userId: rand(occUsers),
          title: t.title, description: t.description,
          category: t.category, priority: t.priority, status,
          unitNumber: maybe(0.6) ? `${randInt(1, 8)}0${randInt(1, 4)}` : null,
          createdAt: created, updatedAt: created,
          resolvedAt: status === "resolvido"
            ? new Date(created.getTime() + randInt(1, 14) * 24 * 60 * 60 * 1000)
            : null,
        },
      });
    }

    // ============================================================
    // Financeiro: 6 meses passados + próximos
    // ============================================================
    const today = new Date();
    for (let monthOffset = -5; monthOffset <= 1; monthOffset++) {
      const month = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
      const monthLabel = month.toLocaleString("pt-BR", { month: "long", year: "numeric" });
      const isPast = monthOffset < 0;
      const isCurrent = monthOffset === 0;

      // Receitas: várias taxas condominiais (uma por unidade ocupada simulada)
      const numTaxas = randInt(35, 55);
      for (let i = 0; i < numTaxas; i++) {
        const status = isPast ? (maybe(0.92) ? "pago" : "atrasado") : "pendente";
        await prisma.finance.create({
          data: {
            condominiumId: condo.id, type: "receita", category: "condominio",
            description: `Taxa condominial - ${monthLabel}`,
            amount: randInt(380, 850),
            dueDate: new Date(month.getFullYear(), month.getMonth(), 10),
            paidDate: status === "pago"
              ? new Date(month.getFullYear(), month.getMonth(), randInt(1, 9))
              : null,
            status,
            unitNumber: `${randInt(1, 8)}0${randInt(1, 4)}`,
          },
        });
      }

      // Outras receitas
      for (let i = 0; i < randInt(1, 4); i++) {
        const r = rand(FINANCE_TEMPLATES.receitas);
        const status = isPast ? "pago" : isCurrent ? rand(["pago", "pendente"]) : "pendente";
        await prisma.finance.create({
          data: {
            condominiumId: condo.id, type: "receita",
            category: r.category, description: `${r.description} - ${monthLabel}`,
            amount: r.amount(),
            dueDate: new Date(month.getFullYear(), month.getMonth(), randInt(5, 28)),
            paidDate: status === "pago"
              ? new Date(month.getFullYear(), month.getMonth(), randInt(1, 28))
              : null,
            status,
          },
        });
      }

      // Despesas
      for (let i = 0; i < randInt(8, 14); i++) {
        const d = rand(FINANCE_TEMPLATES.despesas);
        const status = isPast ? "pago" : isCurrent ? rand(["pago", "pendente", "pendente"]) : "pendente";
        await prisma.finance.create({
          data: {
            condominiumId: condo.id, type: "despesa",
            category: d.category, description: `${d.description} - ${monthLabel}`,
            amount: d.amount(),
            dueDate: new Date(month.getFullYear(), month.getMonth(), randInt(5, 28)),
            paidDate: status === "pago"
              ? new Date(month.getFullYear(), month.getMonth(), randInt(1, 28))
              : null,
            status,
          },
        });
      }
    }

    // ============================================================
    // Avisos
    // ============================================================
    for (const t of NOTICE_TEMPLATES) {
      await prisma.notice.create({
        data: {
          condominiumId: condo.id,
          title: t.title, content: t.content,
          category: t.category, priority: t.priority,
          publishedAt: daysAgo(randInt(0, 30)),
          expiresAt: t.expiresInDays ? daysFromNow(t.expiresInDays) : null,
        },
      });
    }

    // ============================================================
    // Assembleias: passadas com ata + futuras
    // ============================================================
    await prisma.assembly.create({
      data: {
        condominiumId: condo.id,
        title: "Assembleia Geral Ordinária - 2025", type: "ordinaria",
        description: "Aprovação de contas do exercício 2024 e eleição da nova administração.",
        agenda: "1. Abertura\n2. Leitura da ata anterior\n3. Apresentação das contas\n4. Eleição\n5. Encerramento",
        scheduledAt: daysAgo(120), startedAt: daysAgo(120), endedAt: daysAgo(120),
        status: "encerrada", attendeesCount: randInt(35, 80),
        minutesText: "Aos vinte dias do mês, reuniram-se os condôminos para deliberar sobre os assuntos da pauta. Foram aprovadas por unanimidade as contas do exercício anterior. O síndico foi reeleito com 92% dos votos.",
      },
    });
    await prisma.assembly.create({
      data: {
        condominiumId: condo.id,
        title: "Assembleia Extraordinária - Reforma da Fachada", type: "extraordinaria",
        description: "Discussão sobre orçamentos para reforma da fachada e cronograma da obra.",
        agenda: "1. Apresentação de 3 orçamentos\n2. Discussão\n3. Votação\n4. Definição do cronograma",
        scheduledAt: daysAgo(60), startedAt: daysAgo(60), endedAt: daysAgo(60),
        status: "encerrada", attendeesCount: randInt(25, 60),
        minutesText: "Foram apresentados três orçamentos. Aprovou-se o orçamento da empresa Renova Engenharia, com prazo de 90 dias para conclusão.",
      },
    });
    await prisma.assembly.create({
      data: {
        condominiumId: condo.id,
        title: "Reunião de Conselho - Mensal", type: "ordinaria",
        description: "Reunião regular do conselho consultivo.",
        scheduledAt: daysFromNow(7), status: "agendada",
      },
    });
    await prisma.assembly.create({
      data: {
        condominiumId: condo.id,
        title: "Assembleia Extraordinária - Pet Friendly", type: "extraordinaria",
        description: "Votação sobre alteração da convenção para permitir animais de pequeno porte.",
        agenda: "1. Apresentação da proposta\n2. Debate\n3. Votação por escrutínio secreto",
        scheduledAt: daysFromNow(21), status: "agendada",
      },
    });

    // ============================================================
    // Visitantes
    // ============================================================
    const occupiedUnits = await prisma.unit.findMany({
      where: { floor: { tower: { condominiumId: condo.id } }, status: "ocupado" },
    });

    // Visitantes históricos (últimos 30 dias)
    for (let i = 0; i < randInt(40, 80); i++) {
      const day = randInt(1, 30);
      const entryAt = daysAgo(day);
      const exitAt = new Date(entryAt.getTime() + randInt(30, 240) * 60 * 1000);
      await prisma.visitor.create({
        data: {
          unitId: rand(occupiedUnits).id,
          name: rand(VISITOR_NAMES),
          document: String(randInt(100000000, 999999999)),
          phone: randomPhone(),
          reason: rand(VISITOR_REASONS),
          vehiclePlate: maybe(0.4) ? randomPlate() : null,
          status: "saiu",
          entryAt, exitAt,
        },
      });
    }

    // Aguardando agora
    for (let i = 0; i < randInt(2, 4); i++) {
      await prisma.visitor.create({
        data: {
          unitId: rand(occupiedUnits).id,
          name: rand(VISITOR_NAMES),
          document: String(randInt(100000000, 999999999)),
          phone: randomPhone(),
          reason: rand(VISITOR_REASONS),
          status: "aguardando",
          entryAt: new Date(Date.now() - randInt(2, 30) * 60 * 1000),
        },
      });
    }

    // Autorizados (dentro)
    for (let i = 0; i < randInt(3, 6); i++) {
      await prisma.visitor.create({
        data: {
          unitId: rand(occupiedUnits).id,
          name: rand(VISITOR_NAMES),
          document: String(randInt(100000000, 999999999)),
          phone: randomPhone(),
          reason: rand(VISITOR_REASONS),
          vehiclePlate: maybe(0.5) ? randomPlate() : null,
          status: "autorizado",
          entryAt: new Date(Date.now() - randInt(15, 180) * 60 * 1000),
        },
      });
    }

    console.log(`   ✓ ${config.towers.length} torres, estrutura completa criada`);
  }

  // ============================================================
  // Resumo
  // ============================================================
  const stats = await Promise.all([
    prisma.user.count(),
    prisma.condominium.count(),
    prisma.tower.count(),
    prisma.unit.count(),
    prisma.resident.count(),
    prisma.vehicle.count(),
    prisma.occurrence.count(),
    prisma.finance.count(),
    prisma.assembly.count(),
    prisma.notice.count(),
    prisma.visitor.count(),
    prisma.commonArea.count(),
  ]);

  console.log("\n✅ Seed concluído!\n");
  console.log("📊 Estatísticas:");
  console.log(`   Usuários:       ${stats[0]}`);
  console.log(`   Condomínios:    ${stats[1]}`);
  console.log(`   Torres:         ${stats[2]}`);
  console.log(`   Unidades:       ${stats[3]}`);
  console.log(`   Moradores:      ${stats[4]}`);
  console.log(`   Veículos:       ${stats[5]}`);
  console.log(`   Ocorrências:    ${stats[6]}`);
  console.log(`   Lançamentos:    ${stats[7]}`);
  console.log(`   Assembleias:    ${stats[8]}`);
  console.log(`   Avisos:         ${stats[9]}`);
  console.log(`   Visitantes:     ${stats[10]}`);
  console.log(`   Áreas comuns:   ${stats[11]}`);
  console.log("\n🔑 Credenciais:");
  console.log("   admin@sindicore.com    / admin123  (admin)");
  console.log("   sindico@sindicore.com  / admin123  (síndico)");
  console.log("   porteiro@sindicore.com / admin123  (porteiro)");
  console.log("   patricia@sindicore.com / admin123  (síndico — Vista Verde)\n");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
