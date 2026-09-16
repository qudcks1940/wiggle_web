import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { startTestServer } from "./harness/server.mjs";
import { sha256 } from "../lib/token-crypto.ts";

// 교사 인증은 더 이상 oai-* 헤더가 아니라 wiggle_teacher 세션 쿠키다 (lib/security.ts requireTeacher).
// 구글 OAuth 왕복을 흉내 내는 대신 교사 행과 세션을 DB에 직접 심고 그 토큰만 쿠키로 보낸다.
async function signInTeacher(server, email) {
  // 스키마는 첫 요청의 ensureSchema에서 세워진다 — 시드보다 먼저 한 번 두드려 테이블을 만든다.
  await server.fetch("/api/teacher");
  const token = randomUUID();
  const teacherId = `teacher_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  const now = new Date();
  await server.DB.batch([
    server.DB.prepare(`INSERT INTO teachers(id, email, display_name, credential_hash, credential_salt) VALUES (?, ?, ?, '', '')`)
      .bind(teacherId, email, email.split("@")[0]),
    server.DB.prepare(`INSERT INTO teacher_sessions(token_hash, teacher_id, expires_at, last_used_at) VALUES (?, ?, ?, ?)`)
      .bind(await sha256(token), teacherId, new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(), now.toISOString()),
  ]);
  return { "content-type": "application/json", cookie: `wiggle_teacher=${token}` };
}

// 주소는 x-forwarded-for로 흉내 낸다 — 플랫폼이 덮어쓰는, 앱이 실제로 신뢰하는 헤더다.
function studentHeaders(ip) {
  return { "content-type": "application/json", "x-forwarded-for": ip };
}

test("class status, seat re-entry, archive and restore stay safe", async (context) => {
  const server = await startTestServer();
  context.after(() => server.dispose());
  const teacherHeaders = await signInTeacher(server, "profile-manager@example.com");

  const createdClass = await server.fetch("/api/teacher", {
    method: "POST",
    headers: teacherHeaders,
    body: JSON.stringify({ action: "createClassroom", displayName: "중복 점검반", roster: [{ seatNumber: 1, realName: "김민준" }, { seatNumber: 2, realName: "이서연" }] }),
  });
  assert.equal(createdClass.status, 201);
  const createdPayload = await createdClass.json();
  const classroom = createdPayload.classroom;

  // 명단으로 만든 자리는 아이가 들어오기 전까지 비어 있다 — 학생 화면에는 "번호를 넣을 수 있는 반"으로만 보인다.
  const emptyStatus = await server.fetch("/api/student", {
    method: "POST", headers: studentHeaders("203.0.113.100"), body: JSON.stringify({ action: "entryStatus", entry: classroom.classCode }),
  });
  assert.equal(emptyStatus.status, 200);
  assert.deepEqual(await emptyStatus.json(), { classroomName: "중복 점검반", hasProfiles: true, hasRoster: true });

  // 입장은 수업 코드 → 참여 코드다. 코드는 교사 응답(createClassroom)에만 실린다.
  const codeFor = (seatNumber) => createdPayload.entryCodes.find((row) => row.seatNumber === seatNumber).entryCode;
  const joinBody = { action: "join", entry: classroom.classCode, entryCode: codeFor(1), animal: "🐰" };
  const joined = await server.fetch("/api/student", {
    method: "POST", headers: studentHeaders("203.0.113.101"), body: JSON.stringify(joinBody),
  });
  assert.equal(joined.status, 201);
  const joinedProfile = await joined.json();
  assert.equal(joinedProfile.personalQrToken, undefined);
  assert.equal(joinedProfile.student.nickname, "솔이");

  // 같은 코드로 다시 오면 같은 학생이다. 자리는 한 아이의 것이고 두 번 차지되지 않는다.
  const duplicate = await server.fetch("/api/student", {
    method: "POST", headers: studentHeaders("203.0.113.102"), body: JSON.stringify(joinBody),
  });
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).student.id, joinedProfile.student.id);

  const DB = server.DB;
  // 명단이 자리 두 개를 만들었고, 아이가 들어와도 프로필이 새로 늘지 않는다.
  assert.equal((await DB.prepare("SELECT COUNT(*) AS count FROM student_profiles").first()).count, 2);
  await DB.prepare(`INSERT INTO artworks(id, student_id, classroom_id, title, topic, learning_mode) VALUES ('artwork_kept', ?, ?, '보관 그림', '선', 'practice')`)
    .bind(joinedProfile.student.id, classroom.id).run();

  const archived = await server.fetch("/api/teacher", {
    method: "POST",
    headers: teacherHeaders,
    body: JSON.stringify({ action: "archiveStudent", classroomId: classroom.id, studentId: joinedProfile.student.id }),
  });
  assert.equal(archived.status, 200);
  assert.deepEqual(await archived.json(), { archived: true, studentId: joinedProfile.student.id });

  const roomAfterArchive = await server.fetch(`/api/teacher?classroomId=${classroom.id}`, { headers: teacherHeaders });
  assert.equal(roomAfterArchive.status, 200);
  const archivedRoom = await roomAfterArchive.json();
  assert.equal(archivedRoom.students.length, 1, "남은 자리는 2번 하나다");
  assert.equal(archivedRoom.archivedStudents.length, 1);
  assert.equal(archivedRoom.archivedStudents[0].artworkCount, 1);

  const rejectedSession = await server.fetch("/api/student", {
    headers: { authorization: `Bearer ${joinedProfile.deviceToken}` },
  });
  assert.equal(rejectedSession.status, 401);
  assert.equal((await DB.prepare("SELECT COUNT(*) AS count FROM artworks WHERE id = 'artwork_kept'").first()).count, 1);
  assert.ok((await DB.prepare("SELECT revoked_at AS revokedAt FROM device_sessions WHERE student_id = ?").bind(joinedProfile.student.id).first()).revokedAt);

  const restored = await server.fetch("/api/teacher", {
    method: "POST",
    headers: teacherHeaders,
    body: JSON.stringify({ action: "restoreStudent", classroomId: classroom.id, studentId: joinedProfile.student.id }),
  });
  assert.equal(restored.status, 200);

  // 다른 기기에서도 참여 코드 하나로 자기 그림에 돌아온다(학급 QR 토큰으로 들어와도 같다).
  const recovered = await server.fetch("/api/student", {
    method: "POST",
    headers: studentHeaders("203.0.113.103"),
    body: JSON.stringify({ action: "join", entry: classroom.joinToken, entryCode: codeFor(1) }),
  });
  assert.equal(recovered.status, 200);
  assert.equal((await recovered.json()).student.id, joinedProfile.student.id);

  // 별명은 동물의 기본 별명이라 겹칠 수 있다. 코드가 다르면 다른 아이이고, 교사 화면만 그 사실을 안다.
  const sameNickname = await server.fetch("/api/student", {
    method: "POST",
    headers: studentHeaders("203.0.113.106"),
    body: JSON.stringify({ ...joinBody, entryCode: codeFor(2) }),
  });
  assert.equal(sameNickname.status, 201);
  assert.equal((await DB.prepare("SELECT COUNT(*) AS count FROM student_profiles WHERE archived_at IS NULL").first()).count, 2);

  const roomWithDuplicateNicknames = await server.fetch(`/api/teacher?classroomId=${classroom.id}`, { headers: teacherHeaders });
  assert.equal(roomWithDuplicateNicknames.status, 200);
  const duplicateNicknameStudents = (await roomWithDuplicateNicknames.json()).students;
  assert.equal(duplicateNicknameStudents.length, 2);
  assert.ok(duplicateNicknameStudents.every((student) => student.duplicateNickname === true));
});
