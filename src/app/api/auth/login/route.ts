import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, createToken, COOKIE_NAME } from "@/lib/auth";
import {
  ok,
  rateLimit,
  parseBody,
  withErrorHandler,
  errors,
} from "@/lib/api";
import { loginSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Rate limit anti brute-force: 10 tentativas/min por IP
  rateLimit(req, "login", env.AUTH_RATE_LIMIT, 60_000);

  const { email, password } = await parseBody(req, loginSchema);

  const user = await prisma.user.findUnique({
    where: { email, active: true },
    include: {
      condominiums: { include: { condominium: true } },
    },
  });

  if (!user || !(await comparePassword(password, user.password))) {
    // Mensagem genérica para não revelar se o e-mail existe
    logger.warn("login_failed", { email });
    throw errors.unauthorized("Credenciais inválidas");
  }

  const token = await createToken(user.id);

  const response = ok({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      condominiums: user.condominiums,
    },
  });

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.IS_PRODUCTION,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: "/",
  });

  logger.info("login_success", { userId: user.id, email });
  return response;
});
