import { comparePassword, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  withAuth,
  parseBody,
  rateLimit,
  ok,
  errors,
} from "@/lib/api";
import { changePasswordSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export const POST = withAuth(async ({ req, user }) => {
  rateLimit(req, "change-password", 5, 60_000);

  const { currentPassword, newPassword } = await parseBody(req, changePasswordSchema);

  const valid = await comparePassword(currentPassword, user.password);
  if (!valid) {
    logger.warn("change_password_invalid_current", { userId: user.id });
    throw errors.badRequest("Senha atual incorreta");
  }

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

  logger.info("password_changed", { userId: user.id });
  return ok({ success: true });
});
