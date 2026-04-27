/**
 * Logger estruturado simples (sem dependências externas).
 * Pronto para ser substituído por Pino/Winston em produção pesada.
 */

import { env } from "./env";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const COLORS = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m", // green
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
  reset: "\x1b[0m",
} as const;

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[env.LOG_LEVEL];
}

function format(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const base = `${timestamp} [${level.toUpperCase()}] ${msg}`;

  if (env.IS_PRODUCTION) {
    // JSON estruturado em produção
    return JSON.stringify({ timestamp, level, msg, ...meta });
  }

  // Colorido em dev
  const color = COLORS[level];
  const metaStr = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `${color}${base}${COLORS.reset}${metaStr}`;
}

function log(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const line = format(level, msg, meta);
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
};
