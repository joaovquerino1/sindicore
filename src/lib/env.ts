/**
 * Validação de variáveis de ambiente em tempo de boot.
 * Falha rápido se algo crítico estiver ausente em produção.
 */

const isProduction = process.env.NODE_ENV === "production";
// NEXT_PHASE = 'phase-production-build' durante next build
const isBuilding = process.env.NEXT_PHASE === "phase-production-build";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(
      `Variável de ambiente obrigatória ausente: ${name}. ` +
        `Defina-a antes de iniciar a aplicação.`
    );
  }
  // Em produção (runtime, não build), recusar valor de desenvolvimento
  if (isProduction && !isBuilding && value === fallback) {
    throw new Error(
      `Variável ${name} está usando valor padrão de desenvolvimento em produção. ` +
        `Configure um valor seguro.`
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function optionalInt(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const DEV_JWT_SECRET = "sindicore-dev-only-secret-DO-NOT-USE-IN-PROD-x9k2m4";

export const env = {
  NODE_ENV: optional("NODE_ENV", "development") as
    | "development"
    | "production"
    | "test",
  IS_PRODUCTION: isProduction,

  JWT_SECRET: required("JWT_SECRET", DEV_JWT_SECRET),
  DATABASE_URL: required("DATABASE_URL", "file:./dev.db"),

  PORT: optionalInt("PORT", 3000),
  HOSTNAME: optional("HOSTNAME", "0.0.0.0"),

  LOG_LEVEL: optional("LOG_LEVEL", isProduction ? "info" : "debug") as
    | "debug"
    | "info"
    | "warn"
    | "error",

  AUTH_RATE_LIMIT: optionalInt("AUTH_RATE_LIMIT", 10),
  UPLOAD_MAX_MB: optionalInt("UPLOAD_MAX_MB", 10),

  ALLOWED_ORIGINS: optional("ALLOWED_ORIGINS", "*")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
} as const;

// Warn (não falhar) quando o JWT secret é o de dev em modo dev
if (!isProduction && !isBuilding && env.JWT_SECRET === DEV_JWT_SECRET) {
  console.warn(
    "\x1b[33m⚠️  Usando JWT_SECRET de desenvolvimento. Defina JWT_SECRET no .env para silenciar esta mensagem.\x1b[0m"
  );
}
