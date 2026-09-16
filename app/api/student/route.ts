import { bindings, ensureSchema } from "@/db/runtime";
import { cleanText, clearRateLimit, clientIp, deriveSecret, id, isLocalDemoRequest, jsonError, noStoreJson, normalizePicturePassword, picturePasswordLength, randomToken, rateLimit, sameOrigin, sha256, studentFromRequest, verifySecret } from "@/lib/security";
import { activityLabel, normalizeActivityKey } from "@/lib/lesson-content";
import { ensureLocalStorybookStudent } from "@/lib/dev-only/demo-seed";

type RecoveredStudent = { id: string; nickname: string; animal: string; classroomName: string; pictureHash: string; pictureSalt: string };

async function prepareDeviceSession() {
  const token = randomToken(32); const now = new Date();
  const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const tokenHash = await sha256(token);
  const lastUsedAt = now.toISOString();
  return { token, expiresAt, tokenHash, lastUsedAt };
}

async function issueDeviceSession(studentId: string) {
  const db = bindings().DB;
  const device = await prepareDeviceSession();
  const inserted = await db.prepare(`INSERT INTO device_sessions(token_hash, student_id, expires_at, last_used_at) SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM student_profiles s JOIN classrooms c ON c.id = s.classroom_id WHERE s.id = ? AND s.archived_at IS NULL AND c.active = 1)`).bind(device.tokenHash, studentId, device.expiresAt, device.lastUsedAt, studentId).run();
  if (!inserted.meta.changes) return null;
  return { token: device.token, expiresAt: device.expiresAt };
}

async function classroomForEntry(codeOrToken: string) {
  return bindings().DB.prepare(`SELECT id, display_name AS displayName, class_code AS classCode, admission_open AS admissionOpen FROM classrooms WHERE active = 1 AND (class_code = ? OR join_token = ?)`).bind(codeOrToken, codeOrToken).first<{ id: string; displayName: string; classCode: string; admissionOpen: number }>();
}

// 학교 Wi-Fi는 NAT 뒤라 한 학급 전체가 공인 IP 하나로 보인다. IP 한도는 학급 규모를
// 견딜 만큼 넉넉히 두고, 무차별 대입은 대상(학생·프로필) 단위 한도로 막는다.
const IP_ENTRY_LIMIT = 180;
const IP_ENTRY_WINDOW_SECONDS = 10 * 60;
const TARGET_ATTEMPT_LIMIT = 8;
const TARGET_ATTEMPT_WINDOW_SECONDS = 15 * 60;
const CLASSROOM_JOIN_LIMIT = 60;

const requestIp = clientIp;
function entryRateKey(request: Request) { return `student-entry:${requestIp(request)}`; }
function ipAllowed(request: Request) { return rateLimit(entryRateKey(request), IP_ENTRY_LIMIT, IP_ENTRY_WINDOW_SECONDS); }
function targetKey(target: string) { return `student-target:${target}`; }
function targetAllowed(target: string) { return rateLimit(targetKey(target), TARGET_ATTEMPT_LIMIT, TARGET_ATTEMPT_WINDOW_SECONDS); }
function presentedToken(request: Request) { return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""; }

export async function GET(request: Request) {
  const student = await studentFromRequest(request);
  if (!student) return jsonError("이 기기의 학생 정보를 찾지 못했어요.", 401);
  const db = bindings().DB;
  const url = new URL(request.url);
  const artworkOffset = Math.max(0, Number.parseInt(url.searchParams.get("artworkOffset") ?? "0", 10) || 0);
  const artworkPageSize = 40;
  // 학생 홈은 12초마다 이 응답을 다시 부른다. 서로 의존하지 않는 조회를 순서대로 await 하면
  // D1 왕복이 그대로 쌓이므로 한 번에 보내고, 현재 활동 작품만 학급 활동을 읽은 뒤 이어서 조회한다.
  const now = new Date().toISOString();
  const [artworkRows, classroom, latestUnfinishedArtwork, artworkTotalRow, messages, teacherView] = await Promise.all([
    db.prepare(`SELECT id, title, topic, learning_mode AS learningMode, lesson_slug AS lessonSlug, status, current_step AS currentStep, revision, CASE WHEN thumbnail_key IS NOT NULL OR final_image_key IS NOT NULL THEN 1 ELSE 0 END AS hasImage, updated_at AS updatedAt, completed_at AS completedAt FROM artworks WHERE student_id = ? ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?`).bind(student.id, artworkPageSize + 1, artworkOffset).all(),
    db.prepare(`SELECT current_activity AS currentActivity FROM classrooms WHERE id = ?`).bind(student.classroomId).first<{ currentActivity: string }>(),
    db.prepare(`SELECT id, title, learning_mode AS learningMode, lesson_slug AS lessonSlug, status, current_step AS currentStep, updated_at AS updatedAt FROM artworks WHERE student_id = ? AND status <> 'complete' ORDER BY updated_at DESC, id DESC LIMIT 1`).bind(student.id).first(),
    db.prepare(`SELECT COUNT(*) AS count FROM artworks WHERE student_id = ?`).bind(student.id).first<{ count: number }>(),
    db.prepare(`SELECT id, body, createdAt, audience, seenAt FROM (SELECT m.id, m.body, m.created_at AS createdAt, CASE WHEN m.student_id IS NULL THEN 'all' ELSE 'student' END AS audience, r.seen_at AS seenAt FROM teacher_messages m LEFT JOIN message_receipts r ON r.message_id = m.id AND r.student_id = ? WHERE m.classroom_id = ? AND (m.student_id IS NULL OR m.student_id = ?) ORDER BY m.created_at DESC, m.id DESC LIMIT 50) recent ORDER BY createdAt ASC, id ASC`).bind(student.id, student.classroomId, student.id).all<{ id: string; body: string; createdAt: string; audience: string; seenAt: string | null }>(),
    db.prepare(`SELECT 1 FROM teacher_views WHERE student_id = ? AND classroom_id = ? AND expires_at > ? LIMIT 1`).bind(student.id, student.classroomId, now).first(),
  ]);
  const artworks = artworkRows.results.slice(0, artworkPageSize);
  const currentActivityKey = normalizeActivityKey(classroom?.currentActivity);
  const currentLessonSlug = currentActivityKey.startsWith("lesson:") ? currentActivityKey.slice(7) : null;
  const currentActivityArtwork = currentLessonSlug
    ? await db.prepare(`SELECT id, title, learning_mode AS learningMode, lesson_slug AS lessonSlug, status, current_step AS currentStep, updated_at AS updatedAt FROM artworks WHERE student_id = ? AND lesson_slug = ? ORDER BY updated_at DESC, id DESC LIMIT 1`).bind(student.id, currentLessonSlug).first()
    : await db.prepare(`SELECT id, title, learning_mode AS learningMode, lesson_slug AS lessonSlug, status, current_step AS currentStep, updated_at AS updatedAt FROM artworks WHERE student_id = ? AND learning_mode = 'free' ORDER BY updated_at DESC, id DESC LIMIT 1`).bind(student.id).first();
  const artworkTotal = Number(artworkTotalRow?.count ?? 0);
  const teacherViewing = Boolean(teacherView);
  return noStoreJson({ student, artworks, artworkTotal, currentActivityArtwork, latestUnfinishedArtwork, artworkHasMore: artworkRows.results.length > artworkPageSize, artworkNextOffset: artworkOffset + artworks.length, messages: messages.results, teacherViewing, currentActivityKey, currentActivityLabel: activityLabel(currentActivityKey) });
}

async function studentPost(request: Request) {
  if (!sameOrigin(request)) return jsonError("요청 출처를 확인할 수 없어요.", 403);
  await ensureSchema();
  const payload = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = cleanText(payload.action, 30);

  if (action === "localStorybookDemo") {
    if (!isLocalDemoRequest(request)) return jsonError("로컬 체험에서만 사용할 수 있어요.", 404);
    if (!(await rateLimit(`local-storybook-demo:${requestIp(request)}`, 12, 60))) return jsonError("체험 준비가 너무 빨라요. 잠시 후 다시 해 주세요.", 429);
    const student = await ensureLocalStorybookStudent();
    const demoSession = await issueDeviceSession(student.id);
    if (!demoSession) return jsonError("체험 학생을 준비하지 못했어요.", 500);
    return noStoreJson({ student, deviceToken: demoSession.token, expiresAt: demoSession.expiresAt });
  }

  if (action === "logout") {
    const student = await studentFromRequest(request);
    if (!student) return jsonError("활성 학생 세션이 없어요.", 401);
    const token = presentedToken(request);
    await bindings().DB.prepare(`UPDATE device_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ? AND student_id = ?`).bind(await sha256(token), student.id).run();
    return noStoreJson({ ok: true });
  }

  if (action === "ackTeacherMessage") {
    const student = await studentFromRequest(request);
    if (!student) return jsonError("활성 학생 세션이 없어요.", 401);
    const messageId = cleanText(payload.messageId, 80);
    if (!messageId) return jsonError("확인할 선생님 말씀을 찾지 못했어요.", 400);
    const db = bindings().DB;
    const accessible = await db.prepare(`SELECT 1 FROM teacher_messages WHERE id = ? AND classroom_id = ? AND (student_id IS NULL OR student_id = ?) LIMIT 1`).bind(messageId, student.classroomId, student.id).first();
    if (!accessible) return jsonError("확인할 선생님 말씀을 찾지 못했어요.", 404);
    await db.prepare(`INSERT OR IGNORE INTO message_receipts(message_id, student_id, seen_at) VALUES (?, ?, CURRENT_TIMESTAMP)`).bind(messageId, student.id).run();
    return noStoreJson({ ok: true });
  }

  if (action === "ackTeacherMessages") {
    const student = await studentFromRequest(request);
    if (!student) return jsonError("활성 학생 세션이 없어요.", 401);
    const rawMessageIds = Array.isArray(payload.messageIds) ? payload.messageIds.slice(0, 100) : [];
    const messageIds = [...new Set(rawMessageIds
      .filter((value): value is string => typeof value === "string")
      .map((value) => cleanText(value, 80))
      .filter(Boolean))].slice(0, 50);
    if (!messageIds.length) return jsonError("확인할 선생님 말씀을 찾지 못했어요.", 400);

    const db = bindings().DB;
    const placeholders = messageIds.map(() => "?").join(", ");
    const accessible = await db.prepare(`SELECT id FROM teacher_messages WHERE id IN (${placeholders}) AND classroom_id = ? AND (student_id IS NULL OR student_id = ?)`)
      .bind(...messageIds, student.classroomId, student.id)
      .all<{ id: string }>();
    if (accessible.results.length !== messageIds.length) return jsonError("확인할 선생님 말씀을 찾지 못했어요.", 404);

    await db.batch(messageIds.map((messageId) => db.prepare(`INSERT OR IGNORE INTO message_receipts(message_id, student_id, seen_at)
      SELECT ?, ?, CURRENT_TIMESTAMP
      WHERE EXISTS (SELECT 1 FROM teacher_messages WHERE id = ? AND classroom_id = ? AND (student_id IS NULL OR student_id = ?))`)
      .bind(messageId, student.id, messageId, student.classroomId, student.id)));
    return noStoreJson({ ok: true, acknowledged: messageIds.length });
  }

  if (action === "entryStatus") {
    if (!(await ipAllowed(request))) return jsonError("입장 확인이 많아요. 잠시 후 다시 해 주세요.", 429);
    const entry = cleanText(payload.entry, 80);
    const classroom = await classroomForEntry(entry);
    if (!classroom) return jsonError("수업 코드를 다시 확인해 주세요.", 404);
    if (!classroom.admissionOpen) return jsonError("선생님이 입장을 열 때까지 기다려 주세요.", 403);
    const existing = await bindings().DB.prepare(`SELECT 1 FROM student_profiles WHERE classroom_id = ? AND archived_at IS NULL LIMIT 1`).bind(classroom.id).first();
    // 선생님이 명단을 만든 학급이면 아이는 자기 번호를 입력한다. 명단 자체(번호·이름 목록)는
    // 절대 돌려주지 않는다 — 수업 코드를 아는 사람에게 반 전체 실명이 노출되기 때문이다.
    const roster = await bindings().DB.prepare(`SELECT 1 FROM student_profiles WHERE classroom_id = ? AND archived_at IS NULL AND seat_number IS NOT NULL LIMIT 1`).bind(classroom.id).first();
    // 학급 인원이나 프로필 목록은 노출하지 않고, 신규/기존 입장 화면을 고르는 데 필요한
    // 최소 상태만 돌려준다. 수업 코드와 QR은 모두 classroomForEntry에서 같은 방식으로 처리한다.
    return noStoreJson({ classroomName: classroom.displayName, hasProfiles: Boolean(existing), hasRoster: Boolean(roster) });
  }

  if (action === "seatStatus") {
    if (!(await ipAllowed(request))) return jsonError("입장 확인이 많아요. 잠시 후 다시 해 주세요.", 429);
    const entry = cleanText(payload.entry, 80);
    const classroom = await classroomForEntry(entry);
    if (!classroom) return jsonError("수업 코드를 다시 확인해 주세요.", 404);
    if (!classroom.admissionOpen) return jsonError("선생님이 입장을 열 때까지 기다려 주세요.", 403);
    const seatNumber = Number(payload.seatNumber);
    if (!Number.isInteger(seatNumber) || seatNumber < 1 || seatNumber > 99) return jsonError("번호를 다시 확인해 주세요.");
    const seat = await bindings().DB.prepare(`SELECT claimed_at AS claimedAt FROM student_profiles WHERE classroom_id = ? AND seat_number = ? AND archived_at IS NULL`).bind(classroom.id, seatNumber).first<{ claimedAt: string | null }>();
    if (!seat) return jsonError("그 번호는 우리 반에 없어요. 선생님께 물어봐 주세요.", 404);
    // 실명은 돌려주지 않는다. 아이에게 필요한 것은 "처음인지"뿐이다.
    return noStoreJson({ classroomName: classroom.displayName, seatNumber, firstTime: !seat.claimedAt });
  }

  if (action === "join") {
    if (!(await ipAllowed(request))) return jsonError("입장 시도가 많아요. 잠시 후 다시 해 주세요.", 429);
    const entry = cleanText(payload.entry, 80); const classroom = await classroomForEntry(entry);
    if (!classroom) return jsonError("수업 코드를 다시 확인해 주세요.", 404);
    if (!classroom.admissionOpen) return jsonError("선생님이 입장을 열 때까지 기다려 주세요.", 403);
    const nickname = cleanText(payload.nickname, 16); const animal = cleanText(payload.animal, 12); const pictureLength = picturePasswordLength(payload.picturePassword); const picture = normalizePicturePassword(payload.picturePassword);

    // 입장은 선생님이 만든 명단의 번호로만 한다(2026-09-07 사용자 결정). 아이가 스스로
    // 프로필을 만들던 예전 경로는 없앴다 — 같은 학급에 같은 별명이 겹치면 교사가 누가
    // 누구인지 알 수 없었고, 그걸 풀려고 만든 것이 이 명단이다.
    const rosterRow = await bindings().DB.prepare(`SELECT 1 FROM student_profiles WHERE classroom_id = ? AND archived_at IS NULL AND seat_number IS NOT NULL LIMIT 1`).bind(classroom.id).first();
    if (!rosterRow) return noStoreJson({ error: "선생님이 아직 우리 반 명단을 넣지 않았어요. 선생님께 말해 주세요.", code: "NO_ROSTER" }, { status: 409 });

    const seatNumber = Number(payload.seatNumber);
    if (!Number.isInteger(seatNumber) || seatNumber < 1 || seatNumber > 99) return jsonError("번호를 다시 확인해 주세요.");
    if (nickname.length < 2 || !animal || pictureLength !== 3) return jsonError("별명, 동물, 그림 비밀번호 세 개를 모두 골라 주세요.");
    // 학급 상한은 IP와 함께 묶는다. 학급 단독 버킷은 한 클라이언트가 학급 전체를 잠그는 통로가 된다.
    if (!(await rateLimit(`student-join-class:${classroom.id}:${requestIp(request)}`, CLASSROOM_JOIN_LIMIT, IP_ENTRY_WINDOW_SECONDS))) return jsonError("이 수업의 입장 시도가 많아요. 선생님께 알려 주세요.", 429);
    const seat = await bindings().DB.prepare(`SELECT id, claimed_at AS claimedAt FROM student_profiles WHERE classroom_id = ? AND seat_number = ? AND archived_at IS NULL`).bind(classroom.id, seatNumber).first<{ id: string; claimedAt: string | null }>();
    if (!seat) return jsonError("그 번호는 우리 반에 없어요. 선생님께 물어봐 주세요.", 404);
    // 이미 쓰는 자리는 여기서 덮어쓰지 않는다. 덮어쓰면 그 아이의 그림 비밀번호가 바뀌어
    // 본인이 못 들어오고, 아무나 번호만으로 남의 작품을 열 수 있다.
    if (seat.claimedAt) return noStoreJson({ error: "이 번호는 이미 쓰고 있어요. 그림 비밀번호로 들어와 주세요.", code: "SEAT_CLAIMED" }, { status: 409 });
    const seatSalt = randomToken(16); const seatQrToken = randomToken(28); const seatNow = new Date().toISOString();
    const [seatPictureHash, seatQrHash, seatDevice] = await Promise.all([deriveSecret(picture, seatSalt), sha256(seatQrToken), prepareDeviceSession()]);
    // 자리 차지·비밀번호·세션을 한 배치로 묶는다. 나눠 쓰면 중간에 실패했을 때
    // 자리는 차지됐는데 비밀번호나 세션이 없어 아이가 영영 못 들어온다(교사가 손대야 한다).
    // claimed_at IS NULL 조건이 동시 입장도 막는다 — 먼저 성공한 쪽만 자리를 갖는다.
    // 뒤 두 문장은 방금 쓴 claimed_at 값으로 자기 차지에 묶여, 남이 먼저 차지했으면 아무것도 넣지 않는다.
    const seatResults = await bindings().DB.batch([
      bindings().DB.prepare(`UPDATE student_profiles SET nickname = ?, animal = ?, claimed_at = ?, last_activity_at = ? WHERE id = ? AND claimed_at IS NULL AND archived_at IS NULL AND EXISTS (SELECT 1 FROM classrooms WHERE id = ? AND active = 1 AND admission_open = 1)`).bind(nickname, animal, seatNow, seatNow, seat.id, classroom.id),
      bindings().DB.prepare(`INSERT INTO recovery_credentials(student_id, picture_hash, picture_salt, personal_qr_hash) SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM student_profiles WHERE id = ? AND classroom_id = ? AND claimed_at = ? AND archived_at IS NULL) ON CONFLICT(student_id) DO UPDATE SET picture_hash = excluded.picture_hash, picture_salt = excluded.picture_salt, personal_qr_hash = excluded.personal_qr_hash, reset_at = NULL`).bind(seat.id, seatPictureHash, seatSalt, seatQrHash, seat.id, classroom.id, seatNow),
      bindings().DB.prepare(`INSERT INTO device_sessions(token_hash, student_id, expires_at, last_used_at) SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM student_profiles WHERE id = ? AND classroom_id = ? AND claimed_at = ? AND archived_at IS NULL)`).bind(seatDevice.tokenHash, seat.id, seatDevice.expiresAt, seatDevice.lastUsedAt, seat.id, classroom.id, seatNow),
    ]);
    if (!seatResults[0]?.meta.changes) {
      const nowClaimed = await bindings().DB.prepare(`SELECT claimed_at AS claimedAt FROM student_profiles WHERE id = ? AND archived_at IS NULL`).bind(seat.id).first<{ claimedAt: string | null }>();
      if (nowClaimed?.claimedAt) return noStoreJson({ error: "이 번호는 이미 쓰고 있어요. 그림 비밀번호로 들어와 주세요.", code: "SEAT_CLAIMED" }, { status: 409 });
      return jsonError("입장이 닫혔어요. 선생님께 확인해 주세요.", 403);
    }
    // 아이 화면에는 아이가 고른 별명만 보낸다. 실명은 담임 교사 화면에만 있다.
    return noStoreJson({ student: { id: seat.id, nickname, animal, classroomName: classroom.displayName }, deviceToken: seatDevice.token, expiresAt: seatDevice.expiresAt }, { status: 201 });
  }

  if (action === "switchProfile") {
    if (!(await ipAllowed(request))) return jsonError("확인 시도가 많아요. 잠시 기다려 주세요.", 429);
    const studentId = cleanText(payload.studentId, 40); const pictureLength = picturePasswordLength(payload.picturePassword); const picture = normalizePicturePassword(payload.picturePassword);
    if (pictureLength !== 3) return jsonError("그림 비밀번호 세 개를 골라 주세요.");
    // 대상 학생 계정 단위 한도가 없으면 그림 비밀번호 512가지를 IP만 바꿔 가며 전수 시도할 수 있다.
    if (!(await targetAllowed(`unlock:${studentId}`))) return jsonError("여러 번 틀렸어요. 선생님께 도움을 요청해 주세요.", 429);
    const candidate = await bindings().DB.prepare(`SELECT s.id, s.nickname, s.animal, c.display_name AS classroomName, r.picture_hash AS pictureHash, r.picture_salt AS pictureSalt FROM student_profiles s JOIN classrooms c ON c.id = s.classroom_id JOIN recovery_credentials r ON r.student_id = s.id WHERE s.id = ? AND s.archived_at IS NULL AND c.active = 1`).bind(studentId).first<RecoveredStudent>();
    const valid = candidate ? await verifySecret(picture, candidate.pictureSalt, candidate.pictureHash) : Boolean(await deriveSecret(picture, "missing-profile-salt")) && false;
    if (!candidate || !valid) return jsonError("그림 비밀번호를 다시 확인해 주세요.", 401);
    await clearRateLimit(targetKey(`unlock:${studentId}`));
    const device = await issueDeviceSession(candidate.id);
    if (!device) return jsonError("이 학급은 더 이상 이용할 수 없어요. 선생님께 확인해 주세요.", 403);
    return noStoreJson({ student: { id: candidate.id, nickname: candidate.nickname, animal: candidate.animal, classroomName: candidate.classroomName }, deviceToken: device.token, expiresAt: device.expiresAt });
  }

  if (action === "recover") {
    if (!(await ipAllowed(request))) return jsonError("복구 시도가 많아요. 선생님께 도움을 요청해 주세요.", 429);
    const personalQrToken = cleanText(payload.personalQrToken, 120); let student: RecoveredStudent | null = null;
    const qrTarget = personalQrToken ? `qr:${await sha256(personalQrToken)}` : "";
    if (personalQrToken) {
      if (!(await targetAllowed(qrTarget))) return jsonError("복구 시도가 많아요. 선생님께 도움을 요청해 주세요.", 429);
      student = await bindings().DB.prepare(`SELECT s.id, s.nickname, s.animal, c.display_name AS classroomName, r.picture_hash AS pictureHash, r.picture_salt AS pictureSalt FROM recovery_credentials r JOIN student_profiles s ON s.id = r.student_id JOIN classrooms c ON c.id = s.classroom_id WHERE r.personal_qr_hash = ? AND s.archived_at IS NULL AND c.active = 1`).bind(qrTarget.slice(3)).first<RecoveredStudent>();
    } else {
      const entry = cleanText(payload.entry ?? payload.classCode, 80); const pictureLength = picturePasswordLength(payload.picturePassword); const picture = normalizePicturePassword(payload.picturePassword);
      if (pictureLength !== 3) return jsonError("그림 비밀번호 세 개를 골라 주세요.");
      const classroom = await classroomForEntry(entry);
      if (!classroom) return jsonError("수업 코드를 다시 확인해 주세요.", 404);

      // 재입장은 번호 + 그림 비밀번호다(2026-09-07 사용자 결정). 별명·동물로 찾던 예전
      // 경로는 없앴다 — 번호가 이미 한 사람을 가리켜 후보가 하나이고, 아이가 별명을 잊어도
      // 자기 그림으로 돌아올 수 있다.
      const seatNumber = Number(payload.seatNumber);
      if (!Number.isInteger(seatNumber) || seatNumber < 1 || seatNumber > 99) return jsonError("번호를 다시 확인해 주세요.");
      const seatTarget = `recover:${classroom.id}:seat:${seatNumber}`;
      if (!(await targetAllowed(seatTarget))) return jsonError("여러 번 틀렸어요. 선생님께 도움을 요청해 주세요.", 429);
      const seatStudent = await bindings().DB.prepare(`SELECT s.id, s.nickname, s.animal, c.display_name AS classroomName, r.picture_hash AS pictureHash, r.picture_salt AS pictureSalt FROM student_profiles s JOIN classrooms c ON c.id = s.classroom_id JOIN recovery_credentials r ON r.student_id = s.id WHERE s.classroom_id = ? AND s.seat_number = ? AND s.archived_at IS NULL AND c.active = 1`).bind(classroom.id, seatNumber).first<RecoveredStudent>();
      // 없는 번호에서도 같은 비용을 치러, 응답 시간으로 명단을 캐낼 수 없게 한다.
      if (!seatStudent) { await deriveSecret(picture, "missing-recovery-salt"); return jsonError("번호나 그림 비밀번호를 다시 확인해 주세요.", 401); }
      if (!(await verifySecret(picture, seatStudent.pictureSalt, seatStudent.pictureHash))) return jsonError("번호나 그림 비밀번호를 다시 확인해 주세요.", 401);
      await clearRateLimit(targetKey(seatTarget));
      student = seatStudent;
    }
    if (!student) return jsonError("복구할 학생을 찾지 못했어요.", 404);
    // 성공한 QR 복구도 카운터를 비운다(정상 QR을 15분에 8번 쓰면 막히지 않게).
    // 세션 발급보다 먼저 해야, 이 삭제가 실패해도 클라이언트가 받지 못한 세션이 남지 않는다.
    if (qrTarget) await clearRateLimit(targetKey(qrTarget));
    const device = await issueDeviceSession(student.id);
    if (!device) return jsonError("이 학급은 더 이상 이용할 수 없어요. 선생님께 확인해 주세요.", 403);
    return noStoreJson({ student: { id: student.id, nickname: student.nickname, animal: student.animal, classroomName: student.classroomName }, deviceToken: device.token, expiresAt: device.expiresAt });
  }
  return jsonError("지원하지 않는 요청이에요.");
}

export async function POST(request: Request) {
  try {
    return await studentPost(request);
  } catch (error) {
    console.error("Unexpected student API error", error);
    return jsonError("입장을 처리하지 못했어요. 잠시 뒤 다시 해 주세요.", 500);
  }
}
