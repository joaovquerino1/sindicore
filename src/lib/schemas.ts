/**
 * Schemas Zod compartilhados para validação de input em toda a API.
 */

import { z } from "zod";

// ============================================================
// Primitivos comuns
// ============================================================

export const idSchema = z.string().min(1, "ID é obrigatório");

export const cuidSchema = z
  .string()
  .regex(/^[a-z0-9]{20,}$/i, "ID inválido");

export const emailSchema = z
  .string()
  .email("E-mail inválido")
  .toLowerCase()
  .trim();

export const cnpjSchema = z
  .string()
  .min(14, "CNPJ inválido")
  .max(18, "CNPJ inválido")
  .optional()
  .nullable();

export const cpfSchema = z
  .string()
  .min(11, "CPF inválido")
  .max(14, "CPF inválido")
  .optional()
  .nullable();

export const phoneSchema = z
  .string()
  .min(8, "Telefone inválido")
  .max(20, "Telefone inválido");

export const passwordSchema = z
  .string()
  .min(6, "Senha deve ter no mínimo 6 caracteres")
  .max(100);

export const dateOrDatetimeSchema = z
  .string()
  .or(z.date())
  .transform((v) => (v instanceof Date ? v : new Date(v)));

// ============================================================
// Auth
// ============================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Senha é obrigatória"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

// ============================================================
// Condomínio
// ============================================================

export const condominiumCreateSchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(120),
  cnpj: cnpjSchema,
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  state: z.string().length(2, "Use a sigla do estado").optional().nullable(),
  zipCode: z.string().max(10).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
});

export const condominiumUpdateSchema = condominiumCreateSchema.partial();

// ============================================================
// Estrutura
// ============================================================

export const towerCreateSchema = z.object({
  condominiumId: idSchema,
  name: z.string().min(1).max(80),
  code: z.string().max(20).optional().nullable(),
  order: z.number().int().min(0).optional(),
});

export const floorCreateSchema = z.object({
  towerId: idSchema,
  name: z.string().min(1).max(80),
  number: z.number().int(),
  order: z.number().int().min(0).optional(),
});

export const unitCreateSchema = z.object({
  floorId: idSchema,
  number: z.string().min(1).max(20),
  type: z.enum(["apartamento", "comercial", "garagem"]).default("apartamento"),
  area: z.number().positive().optional().nullable(),
  bedrooms: z.number().int().min(0).optional().nullable(),
  bathrooms: z.number().int().min(0).optional().nullable(),
  parking: z.number().int().min(0).optional(),
  status: z.enum(["ocupado", "vago", "manutencao"]).default("vago"),
});

// ============================================================
// Morador
// ============================================================

export const residentCreateSchema = z.object({
  unitId: idSchema,
  name: z.string().min(2).max(120),
  cpf: cpfSchema,
  rg: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: phoneSchema,
  birthDate: dateOrDatetimeSchema.optional().nullable(),
  type: z.enum(["proprietario", "inquilino", "dependente"]).default("proprietario"),
  active: z.boolean().optional(),
  observation: z.string().max(500).optional().nullable(),
});

export const residentUpdateSchema = residentCreateSchema.partial();

// ============================================================
// Veículo
// ============================================================

export const vehicleCreateSchema = z.object({
  residentId: idSchema,
  plate: z.string().min(6).max(10).transform((v) => v.toUpperCase().trim()),
  brand: z.string().max(40).optional().nullable(),
  model: z.string().max(60).optional().nullable(),
  color: z.string().max(30).optional().nullable(),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
});

export const vehicleUpdateSchema = vehicleCreateSchema.partial().omit({ residentId: true });

// ============================================================
// Ocorrência
// ============================================================

export const occurrenceCreateSchema = z.object({
  condominiumId: idSchema,
  title: z.string().min(3).max(120),
  description: z.string().min(3).max(2000),
  category: z
    .enum(["geral", "manutencao", "seguranca", "barulho", "vazamento", "outros"])
    .default("geral"),
  priority: z.enum(["baixa", "media", "alta", "urgente"]).default("media"),
  unitNumber: z.string().max(20).optional().nullable(),
  status: z.enum(["aberto", "em_andamento", "resolvido", "cancelado"]).optional(),
});

export const occurrenceUpdateSchema = occurrenceCreateSchema.partial().omit({
  condominiumId: true,
});

// ============================================================
// Financeiro
// ============================================================

export const financeCreateSchema = z.object({
  condominiumId: idSchema,
  type: z.enum(["receita", "despesa"]).default("despesa"),
  category: z.string().min(1).max(40),
  description: z.string().min(2).max(200),
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  dueDate: dateOrDatetimeSchema,
  paidDate: dateOrDatetimeSchema.optional().nullable(),
  status: z.enum(["pendente", "pago", "atrasado", "cancelado"]).default("pendente"),
  unitNumber: z.string().max(20).optional().nullable(),
  observation: z.string().max(500).optional().nullable(),
});

export const financeUpdateSchema = financeCreateSchema.partial().omit({
  condominiumId: true,
});

// ============================================================
// Aviso
// ============================================================

export const noticeCreateSchema = z.object({
  condominiumId: idSchema,
  title: z.string().min(3).max(120),
  content: z.string().min(3).max(5000),
  category: z
    .enum(["geral", "manutencao", "assembleia", "financeiro", "seguranca"])
    .default("geral"),
  priority: z.enum(["normal", "importante", "urgente"]).default("normal"),
  expiresAt: dateOrDatetimeSchema.optional().nullable(),
  active: z.boolean().optional(),
});

export const noticeUpdateSchema = noticeCreateSchema.partial();

// ============================================================
// Visitante
// ============================================================

export const visitorCreateSchema = z.object({
  unitId: idSchema,
  name: z.string().min(2).max(120),
  document: z.string().max(20).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  reason: z.string().max(120).optional().nullable(),
  vehiclePlate: z
    .string()
    .max(10)
    .optional()
    .nullable()
    .transform((v) => (v ? v.toUpperCase().trim() : v)),
  status: z.enum(["aguardando", "autorizado", "negado", "saiu"]).default("aguardando"),
  expectedDate: dateOrDatetimeSchema.optional().nullable(),
  observation: z.string().max(500).optional().nullable(),
});

export const visitorUpdateSchema = visitorCreateSchema.partial().omit({ unitId: true });

// ============================================================
// Assembleia
// ============================================================

export const assemblyCreateSchema = z.object({
  condominiumId: idSchema,
  title: z.string().min(3).max(150),
  description: z.string().max(2000).optional().nullable(),
  agenda: z.string().max(5000).optional().nullable(),
  type: z.enum(["ordinaria", "extraordinaria"]).default("ordinaria"),
  scheduledAt: dateOrDatetimeSchema,
  status: z
    .enum(["agendada", "em_andamento", "encerrada", "cancelada"])
    .optional(),
});

export const assemblyUpdateSchema = z.object({
  title: z.string().min(3).max(150).optional(),
  description: z.string().max(2000).optional().nullable(),
  agenda: z.string().max(5000).optional().nullable(),
  type: z.enum(["ordinaria", "extraordinaria"]).optional(),
  scheduledAt: dateOrDatetimeSchema.optional(),
  status: z
    .enum(["agendada", "em_andamento", "encerrada", "cancelada"])
    .optional(),
  startedAt: dateOrDatetimeSchema.optional().nullable(),
  endedAt: dateOrDatetimeSchema.optional().nullable(),
  attendeesCount: z.coerce.number().int().min(0).optional().nullable(),
  minutesText: z.string().max(50000).optional().nullable(),
});

// ============================================================
// Filtros / queries comuns
// ============================================================

export const condoQuerySchema = z.object({
  condominiumId: idSchema.optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});
