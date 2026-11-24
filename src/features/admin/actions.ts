"use server";

import { isAdmin } from "@/features/admin/guard";
import { hashPassword } from "@/lib/auth/password";
import { generateRecoveryCode, normalizeRecoveryCode } from "@/lib/auth/recovery";
import { revalidatePath } from "next/cache";
import { dbBatch, dbFirst, dbRun } from "@/lib/db";
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

/** 신고 처리: 문제없음으로 확인 완료 (기도제목은 그대로 둔다) */
export async function adminResolveReport(reportId: string): Promise<ActionResult> {
  try {
    if (!(await isAdmin())) throw new AppError("FORBIDDEN");
    await dbRun(
      "update prayer_reports set status = 'RESOLVED', resolved_at = datetime('now') where id = ? and status = 'OPEN'",
      [reportId],
    );
    revalidatePath("/admin");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

/**
 * 신고 처리: 기도제목 숨기기.
 * 기도제목을 soft delete(status='DELETED') 해 작성자·동행자 모두에게서 감추고,
 * 그 기도제목에 접수된 신고를 함께 'HIDDEN' 으로 닫는다.
 */
export async function adminHideReportedPrayer(prayerId: string): Promise<ActionResult> {
  try {
    if (!(await isAdmin())) throw new AppError("FORBIDDEN");
    const prayer = await dbFirst<{ id: string }>("select id from prayers where id = ?", [
      prayerId,
    ]);
    if (!prayer) throw new AppError("NOT_FOUND");
    await dbBatch([
      {
        sql: "update prayers set status = 'DELETED', updated_at = datetime('now') where id = ?",
        params: [prayerId],
      },
      {
        sql: "update prayer_reports set status = 'HIDDEN', resolved_at = datetime('now') where prayer_id = ? and status = 'OPEN'",
        params: [prayerId],
      },
    ]);
    revalidatePath("/admin");
    revalidatePath("/home");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}
