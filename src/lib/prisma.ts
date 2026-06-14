import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import fs from "fs";

function getDatabasePath(): string {
  // Vercel (serverless): o filesystem do bundle é somente-leitura.
  // Copiamos o banco demo empacotado para /tmp no cold start — funcional
  // por instância, efêmero por natureza (modo demonstração).
  if (process.env.VERCEL) {
    const tmpPath = "/tmp/sindicore.db";
    if (!fs.existsSync(tmpPath)) {
      const bundled = path.join(process.cwd(), "prisma", "seed.db");
      fs.copyFileSync(bundled, tmpPath);
    }
    return tmpPath;
  }
  const url = process.env.DATABASE_URL || "file:./dev.db";
  const filePath = url.replace(/^file:/, "");
  return path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
}

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({ url: `file:${getDatabasePath()}` });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
