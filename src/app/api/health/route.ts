import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Health check para load balancers e monitoramento.
 * Retorna 200 se a aplicação e o banco estão acessíveis.
 */
export async function GET() {
  const startedAt = Date.now();
  const status: Record<string, unknown> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version ?? "unknown",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    status.database = "ok";
  } catch (e) {
    status.status = "degraded";
    status.database = "error";
    status.databaseError = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(status, { status: 503 });
  }

  status.latencyMs = Date.now() - startedAt;
  return NextResponse.json(status);
}
