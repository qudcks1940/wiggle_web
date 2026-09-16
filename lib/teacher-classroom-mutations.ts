export async function updateClassroomAdmission(DB: D1Database, input: { teacherId: string; classroomId: string; open: boolean }) {
  const result = await DB.prepare(`UPDATE classrooms SET admission_open = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND teacher_id = ? AND active = 1`)
    .bind(input.open ? 1 : 0, input.classroomId, input.teacherId).run();
  return Boolean(result.meta.changes);
}

export async function rotateClassroomEntry(DB: D1Database, input: { teacherId: string; classroomId: string; classCode: string; joinToken: string }) {
  const result = await DB.prepare(`UPDATE classrooms SET class_code = ?, join_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND teacher_id = ? AND active = 1`)
    .bind(input.classCode, input.joinToken, input.classroomId, input.teacherId).run();
  return Boolean(result.meta.changes);
}

export async function upsertTeacherView(DB: D1Database, input: { teacherId: string; classroomId: string; studentId: string; expiresAt: string }) {
  const result = await DB.prepare(`INSERT INTO teacher_views(teacher_id, classroom_id, student_id, expires_at, updated_at)
    SELECT ?, c.id, s.id, ?, CURRENT_TIMESTAMP
    FROM classrooms c JOIN student_profiles s ON s.classroom_id = c.id
    WHERE c.id = ? AND c.teacher_id = ? AND c.active = 1 AND s.id = ? AND s.archived_at IS NULL
    ON CONFLICT(teacher_id, student_id) DO UPDATE SET classroom_id = excluded.classroom_id, expires_at = excluded.expires_at, updated_at = CURRENT_TIMESTAMP`)
    .bind(input.teacherId, input.expiresAt, input.classroomId, input.teacherId, input.studentId).run();
  return Boolean(result.meta.changes);
}
