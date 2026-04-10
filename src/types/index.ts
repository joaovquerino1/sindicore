export type UserRole = "admin" | "sindico" | "porteiro" | "morador";

export type VisitorStatus =
  | "aguardando"
  | "autorizado"
  | "negado"
  | "saiu";

export type UnitStatus = "ocupado" | "vago" | "manutencao";

export type OccurrenceCategory =
  | "geral"
  | "manutencao"
  | "seguranca"
  | "barulho"
  | "vazamento"
  | "outros";

export type OccurrencePriority = "baixa" | "media" | "alta" | "urgente";
export type OccurrenceStatus =
  | "aberto"
  | "em_andamento"
  | "resolvido"
  | "encerrado";

export type FinanceStatus = "pendente" | "pago" | "atrasado" | "cancelado";

export interface DashboardStats {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  totalResidents: number;
  visitorsToday: number;
  visitorsCurrently: number;
  openOccurrences: number;
  pendingFinances: number;
  pendingFinancesAmount: number;
}
