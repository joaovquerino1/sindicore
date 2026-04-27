/**
 * Middleware Edge: aplica security headers em todas as respostas
 * e gera um request ID para correlação de logs.
 */

import { NextRequest, NextResponse } from "next/server";

function randomId(): string {
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

export function middleware(req: NextRequest) {
  const response = NextResponse.next();

  // Request ID para correlação
  const requestId = req.headers.get("x-request-id") ?? randomId();
  response.headers.set("x-request-id", requestId);

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=()"
  );

  // HSTS apenas em produção sobre HTTPS
  if (req.nextUrl.protocol === "https:") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  return response;
}

export const config = {
  // Aplica em todas as rotas exceto assets estáticos do Next
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
};
