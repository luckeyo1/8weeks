"use server";

import { getAuthUser } from "@/features/auth/service";
import { isMissingTableError } from "@/services/bible";
import { dbFirst, dbRun, newId } from "@/lib/db";
import { AppError, toActionError, ok, type ActionResult } from "@/lib/errors";
import { reportSchema, type ReportInput } from "./schema";

/**
 * 기도제목 신고 (구글 플레이 사용자 제작 콘텐츠 정책).
 * 함께 기도하도록 초대받아 내용을 본 사람만 신고할 수 있다. 작성자는 자기 글을 신고할 수 없다.
 * 운영자는 관리자 화면에서 확인 후 '확인 완료' 또는 '기도제목 숨기기'로 처리한다.
 */
export async function reportPrayer(input: ReportInput): Promise<ActionResult> {
  try {
    const parsed = reportSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", parsed.error.issues[0]?.message);
    }
    const { prayerId, reason, detail } = parsed.data;

    const uid = await getAuthUser();
    if (!uid) throw new AppError("UNAUTHENTICATED");

    const prayer = await dbFirst<{ owner_id: string; status: string }>(
      "select owner_id, status from prayers where id = ?",
      [prayerId],
    );
    if (!prayer || prayer.status === "DELETED") throw new AppError("NOT_FOUND");
    if (prayer.owner_id === uid) {
      throw new AppError("FORBIDDEN", "내가 만든 기도제목은 신고할 수 없어요.");
    }

    // 초대를 수락해 내용을 본 적이 있는 사람만 (그만두었거나 접근이 해제된 사람 포함)
    const part = await dbFirst<{ id: string }>(
      "select id from prayer_participants where prayer_id = ? and user_id = ?",
      [prayerId, uid],
    );
    if (!part) throw new AppError("FORBIDDEN");

    try {
      await dbRun(
        "insert into prayer_reports (id, prayer_id, reporter_id, reason, detail) values (?, ?, ?, ?, ?)",
        [newId(), prayerId, uid, reason, detail ?? null],
      );
    } catch (e) {
      if (isMissingTableError(e)) {
        throw new AppError("UNKNOWN", "신고 기능을 준비하고 있어요. 잠시 후 다시 시도해주세요.");
      }
      if (e instanceof Error && /UNIQUE/i.test(e.message)) {
        throw new AppError("VALIDATION", "이미 신고한 기도제목이에요. 운영자가 확인하고 있어요.");
      }
      throw e;
    }

    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}
