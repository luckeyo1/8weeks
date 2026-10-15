"use server";

import { isAdmin } from "@/features/admin/guard";
import { hashPassword } from "@/lib/auth/password";
import { generateRecoveryCode, normalizeRecoveryCode } from "@/lib/auth/recovery";
import { dbFirst, dbRun } from "@/lib/db";
import { AppError, toActionError, ok, type ActionResult } from "@/lib/errors";

/**
 * 관리자 복구 코드 재발급 (P1/D2). 복구 코드를 잃어버린 사용자를 위해
 * 새 코드를 발급하고 해시만 저장한다. 평문 코드는 이 응답에서만 전달되며,
 * 관리자가 본인 확인 후 사용자에게 안전하게 전달한다.
 */
export async function adminReissueRecoveryCode(
  userId: string,
): Promise<ActionResult<{ recoveryCode: string }>> {
  try {
    if (!(await isAdmin())) throw new AppError("FORBIDDEN");

    const user = await dbFirst<{ id: string }>(
      "select id from users where id = ?",
      [userId],
    );
    if (!user) throw new AppError("NOT_FOUND");

    const code = generateRecoveryCode();
    const hash = await hashPassword(normalizeRecoveryCode(code));
    await dbRun(
      "update users set recovery_code_hash = ?, updated_at = datetime('now') where id = ?",
      [hash, userId],
    );

    return ok({ recoveryCode: code });
  } catch (e) {
    return toActionError(e);
  }
}
