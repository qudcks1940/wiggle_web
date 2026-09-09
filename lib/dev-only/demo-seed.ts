import "server-only";
import { bindings, ensureSchema } from "@/db/runtime";
import { deriveSecret, id, randomToken, verifySecret } from "@/lib/security";

type LocalTeacher = { id: string; email: string; displayName: string };

export async function ensureLocalAutoTeacher(): Promise<LocalTeacher> {
  await ensureSchema();
  const db = bindings().DB;
  const existing = await db.prepare(
    `SELECT t.id, t.email, t.display_name AS displayName
       FROM teachers t
      ORDER BY (SELECT MAX(s.last_used_at) FROM teacher_sessions s WHERE s.teacher_id = t.id) DESC,
               (SELECT COUNT(*) FROM classrooms c WHERE c.teacher_id = t.id AND c.active = 1) DESC,
               t.id ASC
      LIMIT 1`,
  ).first<LocalTeacher>();
  if (existing) return existing;

  const teacherId = id("teacher");
  const teacher = { id: teacherId, email: `${teacherId}@localhost.invalid`, displayName: "로컬 선생님" };
  await db.prepare(
    `INSERT INTO teachers(id, email, display_name, credential_hash, credential_salt) VALUES (?, ?, ?, '', '')`,
  ).bind(teacher.id, teacher.email, teacher.displayName).run();
  return teacher;
}

export async function ensureLocalTeacher(email: string, pin: string, displayName: string) {
  await ensureSchema();
  const db = bindings().DB;
  const found = await db.prepare(`SELECT id, credential_hash AS credentialHash, credential_salt AS credentialSalt FROM teachers WHERE email = ?`).bind(email).first<{ id: string; credentialHash: string | null; credentialSalt: string | null }>();
  if (found) {
    if (!found.credentialHash || !found.credentialSalt || !(await verifySecret(pin, found.credentialSalt, found.credentialHash))) return null;
    return found.id;
  }

  const teacherId = id("teacher");
  const salt = randomToken(16);
  const credentialHash = await deriveSecret(pin, salt);
  const classroomId = id("class");
  const classCode = String(1000 + Math.floor(Math.random() * 9000));
  await db.batch([
    db.prepare(`INSERT INTO teachers(id, email, display_name, credential_hash, credential_salt) VALUES (?, ?, ?, ?, ?)`).bind(teacherId, email, displayName, credentialHash, salt),
    db.prepare(`INSERT INTO classrooms(id, teacher_id, display_name, class_code, join_token, admission_open, active, current_activity, current_arc_id, current_episode_id) VALUES (?, ?, ?, ?, ?, 1, 1, 'free', 'bicycle-story', 'bicycle-begin')`).bind(classroomId, teacherId, "로컬 연습반", classCode, randomToken(18)),
  ]);
  return teacherId;
}

export async function ensureLocalStorybookStudent() {
  await ensureSchema();
  const db = bindings().DB;
  const teacherId = "teacher_local_storybook_demo";
  const classroomId = "class_local_storybook_demo";
  const studentId = "student_local_storybook_demo";
  const now = new Date().toISOString();
  await db.batch([
    db.prepare(`INSERT INTO teachers(id, email, display_name, credential_hash, credential_salt)
      VALUES (?, 'storybook-demo@localhost.invalid', '로컬 그림책 선생님', '', '')
      ON CONFLICT(id) DO UPDATE SET display_name = excluded.display_name`).bind(teacherId),
    db.prepare(`INSERT INTO classrooms(id, teacher_id, display_name, class_code, join_token, admission_open, active, current_activity)
      VALUES (?, ?, '그림책 체험반', 'BOOK-DEMO', 'local-storybook-demo-entry', 1, 1, '자유롭게 그리기')
      ON CONFLICT(id) DO UPDATE SET admission_open = 1, active = 1, updated_at = CURRENT_TIMESTAMP`).bind(classroomId, teacherId),
    db.prepare(`INSERT INTO student_profiles(id, classroom_id, nickname, animal, last_activity_at, archived_at)
      VALUES (?, ?, '상상 화가', '🦊', ?, NULL)
      ON CONFLICT(id) DO UPDATE SET classroom_id = excluded.classroom_id, last_activity_at = excluded.last_activity_at, archived_at = NULL`).bind(studentId, classroomId, now),
  ]);
  return { id: studentId, nickname: "상상 화가", animal: "🦊", classroomName: "그림책 체험반" };
}
