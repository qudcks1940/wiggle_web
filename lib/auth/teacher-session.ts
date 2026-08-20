import "server-only";
import { bindings } from "@/db/runtime";
import { randomToken, sha256 } from "@/lib/token-crypto";

export async function issueTeacherSession(teacherId: string) {
  const token = randomToken(32);
  const now = new Date();
  const expires = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  await bindings().DB.prepare(
    `INSERT INTO teacher_sessions(token_hash, teacher_id, expires_at, last_used_at) VALUES (?, ?, ?, ?)`,
  ).bind(await sha256(token), teacherId, expires.toISOString(), now.toISOString()).run();
  return { token, expires };
}
