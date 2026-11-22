import "server-only";

import { getDB } from "@/lib/cf";

/**
 * D1 얇은 헬퍼. 파라미터는 항상 bind() 로 전달(SQL injection 방지).
 */

export async function dbFirst<T>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const db = await getDB();
  const row = await db
    .prepare(sql)
    .bind(...params)
    .first<T>();
  return row ?? null;
}

export async function dbAll<T>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const db = await getDB();
  const { results } = await db
    .prepare(sql)
    .bind(...params)
    .all<T>();
  return results ?? [];
}

export async function dbRun(
  sql: string,
  params: unknown[] = [],
): Promise<D1Result> {
  const db = await getDB();
  return db
    .prepare(sql)
    .bind(...params)
    .run();
}

/** 여러 문장을 한 트랜잭션으로 실행 (D1 batch: 전부 성공하거나 전부 취소) */
export async function dbBatch(
  statements: { sql: string; params?: unknown[] }[],
): Promise<void> {
  const db = await getDB();
  await db.batch(
    statements.map((s) => db.prepare(s.sql).bind(...(s.params ?? []))),
  );
}

/** COUNT(*) 헬퍼 */
export async function dbCount(
  sql: string,
  params: unknown[] = [],
): Promise<number> {
  const row = await dbFirst<{ n: number }>(sql, params);
  return row?.n ?? 0;
}

export function newId(): string {
  return crypto.randomUUID();
}
