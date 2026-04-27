/**
 * Helpers para rotas de API: autenticação, validação, error handling,
 * rate limit em memória e respostas padronizadas.
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";
import { getSession } from "./auth";
import { logger } from "./logger";
import { env } from "./env";

// ============================================================
// Tipos
// ============================================================

export type AuthUser = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export interface ApiContext<P = unknown> {
  req: NextRequest;
  user: AuthUser;
  params: P;
}

export type ApiHandler<P = unknown> = (
  ctx: ApiContext<P>
) => Promise<NextResponse> | NextResponse;

// ============================================================
// Erros de domínio
// ============================================================

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export const errors = {
  unauthorized: (msg = "Não autenticado") => new ApiError(401, msg),
  forbidden: (msg = "Sem permissão") => new ApiError(403, msg),
  notFound: (msg = "Não encontrado") => new ApiError(404, msg),
  badRequest: (msg = "Requisição inválida", details?: unknown) =>
    new ApiError(400, msg, details),
  conflict: (msg = "Conflito") => new ApiError(409, msg),
  tooMany: (msg = "Muitas requisições") => new ApiError(429, msg),
  internal: (msg = "Erro interno") => new ApiError(500, msg),
};

// ============================================================
// Resposta padronizada
// ============================================================

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

// ============================================================
// Rate limit em memória (suficiente para single-instance)
// ============================================================

const buckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimit(
  req: NextRequest,
  bucket: string,
  limit = env.AUTH_RATE_LIMIT,
  windowMs = 60_000
): void {
  const ip = getClientIp(req);
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    logger.warn("rate_limit_hit", { bucket, ip, limit });
    throw new ApiError(429, `Muitas requisições. Tente novamente em ${retryAfter}s.`);
  }

  entry.count++;
}

// ============================================================
// Wrapper para rotas com auth + error handling consistente
// ============================================================

export function withAuth<P = unknown>(
  handler: ApiHandler<P>,
  options: { requireRole?: string[] } = {}
): (req: NextRequest, ctx: { params: Promise<P> }) => Promise<NextResponse> {
  return async (req, ctx) => {
    try {
      const user = await getSession();
      if (!user) throw errors.unauthorized();

      if (options.requireRole && !options.requireRole.includes(user.role)) {
        throw errors.forbidden();
      }

      const params = ctx?.params ? await ctx.params : ({} as P);
      return await handler({ req, user, params });
    } catch (e) {
      return handleError(e, req);
    }
  };
}

/**
 * Para rotas públicas (sem auth) com error handling.
 */
export function withErrorHandler<P = unknown>(
  handler: (req: NextRequest, params: P) => Promise<NextResponse> | NextResponse
): (req: NextRequest, ctx: { params: Promise<P> }) => Promise<NextResponse> {
  return async (req, ctx) => {
    try {
      const params = ctx?.params ? await ctx.params : ({} as P);
      return await handler(req, params);
    } catch (e) {
      return handleError(e, req);
    }
  };
}

// ============================================================
// Validação com Zod
// ============================================================

export async function parseBody<T>(req: NextRequest, schema: ZodSchema<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw errors.badRequest("Corpo da requisição inválido (JSON malformado).");
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    throw errors.badRequest("Dados inválidos", formatZodError(result.error));
  }
  return result.data;
}

export function parseQuery<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): T {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const result = schema.safeParse(params);
  if (!result.success) {
    throw errors.badRequest("Parâmetros inválidos", formatZodError(result.error));
  }
  return result.data;
}

function formatZodError(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const path = issue.path.join(".");
    out[path || "_"] = issue.message;
  }
  return out;
}

// ============================================================
// Tratamento centralizado de erros
// ============================================================

export function handleError(e: unknown, req?: NextRequest): NextResponse {
  if (e instanceof ApiError) {
    if (e.status >= 500) {
      logger.error(e.message, { status: e.status, url: req?.url });
    }
    return NextResponse.json(
      { error: e.message, ...(e.details ? { details: e.details } : {}) },
      { status: e.status }
    );
  }

  // Prisma constraint violation
  const errObj = e as { code?: string; meta?: unknown };
  if (errObj?.code === "P2002") {
    return NextResponse.json(
      { error: "Registro duplicado." },
      { status: 409 }
    );
  }
  if (errObj?.code === "P2025") {
    return NextResponse.json(
      { error: "Registro não encontrado." },
      { status: 404 }
    );
  }

  const message = e instanceof Error ? e.message : "Erro interno";
  logger.error("unhandled_error", {
    message,
    url: req?.url,
    stack: e instanceof Error ? e.stack : undefined,
  });

  return NextResponse.json(
    { error: env.IS_PRODUCTION ? "Erro interno" : message },
    { status: 500 }
  );
}
