"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/features/auth/service";
import { dbRun, newId } from "@/lib/db";
import { AppError, toActionError, ok, type ActionResult } from "@/lib/errors";
import { appTodayISO } from "@/lib/date";

/**
 * 오늘 성경 읽었어요 체크. 하루 1회 — unique(user_id, read_date) 로 중복 차단(멱등).
 * 날짜는 클라이언트가 아니라 서버의 서비스 기준 오늘로 기록한다.
 */
export async function checkBibleReading(): Promise<
  ActionResult<{ readToday: true }>
> {
  try {
    const uid = await getAuthUser();
    if (!uid) throw new AppError("UNAUTHENTICATED");

    try {
      await dbRun(
        "insert into bible_readings (id, user_id, read_date) values (?, ?, ?)",
        [newId(), uid, appTodayISO()],
      );
    } catch (e) {
      if (e instanceof Error && /UNIQUE|constraint/i.test(e.message)) {
        return ok({ readToday: true });
      }
      throw e;
    }

    revalidatePath("/home");
    return ok({ readToday: true });
  } catch (e) {
    return toActionError(e);
  }
}

/** 오늘 체크 해제 (실수로 눌렀을 때). 오늘 기록만 지우고 이전 날짜는 건드리지 않는다. */
export async function uncheckBibleReading(): Promise<
  ActionResult<{ readToday: false }>
> {
  try {
    const uid = await getAuthUser();
    if (!uid) throw new AppError("UNAUTHENTICATED");

    await dbRun(
      "delete from bible_readings where user_id = ? and read_date = ?",
      [uid, appTodayISO()],
    );

    revalidatePath("/home");
    return ok({ readToday: false });
  } catch (e) {
    return toActionError(e);
  }
}
