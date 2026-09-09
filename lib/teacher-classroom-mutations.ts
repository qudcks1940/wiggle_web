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

/**
 * 학급 포인터(아크·회차)를 지정한다 (AD-9, Story 2.1).
 * 검증(isValidArcEpisode)은 라우트에서 끝났다는 전제이며, 여기서는 소유권 WHERE만 강제한다.
 * 아이의 작품·진행 상태는 건드리지 않는다 — 포인터는 학급이 지금 어디를 가리키는가일 뿐이다.
 */
export async function setClassroomEpisode(DB: D1Database, input: { teacherId: string; classroomId: string; arcId: string; episodeId: string }) {
  const result = await DB.prepare(`UPDATE classrooms SET current_arc_id = ?, current_episode_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND teacher_id = ? AND active = 1`)
    .bind(input.arcId, input.episodeId, input.classroomId, input.teacherId).run();
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
