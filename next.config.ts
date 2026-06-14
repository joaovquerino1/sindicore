import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Inclui o banco demo no bundle das funções serverless (Vercel).
  // O Prisma o copia para /tmp no cold start — ver src/lib/prisma.ts.
  outputFileTracingIncludes: {
    "/**": ["./prisma/seed.db"],
  },
};

export default nextConfig;
