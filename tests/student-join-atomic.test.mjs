import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after } from "node:test";
import { resetRows } from "./harness/db.mjs";
import { startTestServer } from "./harness/server.mjs";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

// Next 서버 기동은 프로세스 하나 값이라 테스트마다 띄우면 비싸다. 파일 하나에 서버 하나만 띄우고,
// 테스트가 끝날 때마다 resetDatabase로 격리한다. 세 테스트가 모두 수업 코드 4999를 쓰므로 초기화는 필수다.
let booting;

async function sharedServer() {
  if (!booting) booting = bootServer();
  return booting;
}

async function bootServer() {
  const server = await startTestServer();
  // 스키마는 서버가 첫 요청을 받을 때 세운다. 시드보다 먼저 한 번 찔러 테이블을 만들어 둔다.
  const initialized = await server.fetch("/api/student", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "unsupported" }),
  });
  assert.equal(initialized.status, 400);
  return server;
}

after(async () => {
  if (booting) await booting.then((server) => server.dispose(), () => {});
});

// 이 파일은 실패를 강제하려고 트리거를 만든다. 트리거는 행이 아니라 스키마라 resetRows가 지우지 않으므로
// 다음 테스트로 새지 않게 여기서 먼저 떨어뜨린다.
async function resetDatabase(DB) {
  const triggers = await DB.prepare(`SELECT name FROM sqlite_master WHERE type = 'trigger'`).all();
  for (const trigger of triggers.results) await DB.prepare(`DROP TRIGGER IF EXISTS "${trigger.name}"`).run();
  await resetRows(DB);
}

function joinRequest(ip = "203.0.113.40") {
  // 주소는 x-forwarded-for로 흉내 낸다. cf-connecting-ip는 Cloudflare가 사라져 앱이 더 이상 믿지 않는다.
  return {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ action: "join", entry: "4999", seatNumber: 1, nickname: "토끼화가", animal: "🐰", picturePassword: ["⭐", "⭐", "⭐"] }),
  };
}

/* 선생님이 미리 만들어 둔 빈 자리. 아이는 이 자리를 차지할 뿐 프로필을 새로 만들지 않는다. */
function seatRow(DB, classroomId, id = "student_seat1") {
  return DB.prepare(`INSERT INTO student_profiles(id, classroom_id, seat_number, real_name, claimed_at, nickname, animal, last_activity_at) VALUES (?, ?, 1, '김민준', NULL, '1번', '❔', strftime('%Y-%m-%dT%H:%M:%fZ','now'))`).bind(id, classroomId);
}

async function count(DB, table) {
  return (await DB.prepare(`SELECT COUNT(*) AS count FROM ${table}`).first()).count;
}

test("a failed device-session insert rolls back the entire join and a retry creates one profile", async (context) => {
  const server = await sharedServer();
  context.after(() => resetDatabase(server.DB));

  const DB = server.DB;
  await DB.batch([
    DB.prepare("INSERT INTO teachers(id, email, display_name) VALUES ('teacher_atomic', 'atomic@example.com', 'Atomic')"),
    DB.prepare("INSERT INTO classrooms(id, teacher_id, display_name, class_code, join_token) VALUES ('class_atomic', 'teacher_atomic', '원자성 반', '4999', 'join_atomic')"),
    DB.prepare("CREATE TRIGGER fail_device_session BEFORE INSERT ON device_sessions BEGIN SELECT RAISE(ABORT, 'forced device session failure'); END"),
  ]);
  await seatRow(DB, "class_atomic").run();

  const failed = await server.fetch("/api/student", joinRequest());
  assert.equal(failed.status, 500);
  assert.match(failed.headers.get("content-type") ?? "", /application\/json/);
  assert.match(failed.headers.get("cache-control") ?? "", /no-store/);
  assert.deepEqual(await failed.json(), { error: "입장을 처리하지 못했어요. 잠시 뒤 다시 해 주세요." });
  // 자리는 선생님이 만든 것이라 남지만, 차지되지 않아야 한다 — 비밀번호도 세션도 없어야 한다.
  assert.equal(await count(DB, "student_profiles"), 1);
  assert.equal((await DB.prepare("SELECT claimed_at AS claimedAt FROM student_profiles").first()).claimedAt, null);
  for (const table of ["recovery_credentials", "device_sessions"]) assert.equal(await count(DB, table), 0, table);

  await DB.prepare("DROP TRIGGER fail_device_session").run();
  const retried = await server.fetch("/api/student", joinRequest());
  assert.equal(retried.status, 201);
  const payload = await retried.json();
  assert.equal(payload.student.nickname, "토끼화가");
  assert.ok(payload.deviceToken);
  for (const table of ["student_profiles", "recovery_credentials", "device_sessions"]) assert.equal(await count(DB, table), 1, table);
});

test("join batches all three inserts while switch and recovery retain session issuance", async () => {
  const route = await read("../app/api/student/route.ts");
  const join = route.slice(route.indexOf('if (action === "join")'), route.indexOf('if (action === "switchProfile")'));
  const switchProfile = route.slice(route.indexOf('if (action === "switchProfile")'), route.indexOf('if (action === "recover")'));
  const recover = route.slice(route.indexOf('if (action === "recover")'));
  // 자리 차지·비밀번호·세션은 여전히 한 배치다. 나뉘면 중간 실패에서 자리만 차지돼
  // 비밀번호가 없는 아이가 생기고, 그 아이는 선생님이 손대기 전까지 못 들어온다.
  assert.match(join, /const \[seatPictureHash, seatQrHash, seatDevice\] = await Promise\.all/);
  assert.match(join, /const seatResults = await bindings\(\)\.DB\.batch\(\[[\s\S]*student_profiles[\s\S]*recovery_credentials[\s\S]*device_sessions[\s\S]*\]\)/);
  assert.match(join, /UPDATE student_profiles SET nickname = \?, animal = \?, claimed_at = \?, last_activity_at = \? WHERE id = \? AND claimed_at IS NULL AND archived_at IS NULL AND EXISTS \(SELECT 1 FROM classrooms WHERE id = \? AND active = 1 AND admission_open = 1\)/);
  assert.match(join, /recovery_credentials[^`]*WHERE EXISTS \(SELECT 1 FROM student_profiles WHERE id = \? AND classroom_id = \? AND claimed_at = \? AND archived_at IS NULL\)/);
  assert.match(join, /device_sessions[^`]*WHERE EXISTS \(SELECT 1 FROM student_profiles WHERE id = \? AND classroom_id = \? AND claimed_at = \? AND archived_at IS NULL\)/);
  // 0행일 때 이유를 갈라 준다: 남이 먼저 차지했으면 409, 학급이 닫혔으면 403.
  assert.match(join, /if \(!seatResults\[0\]\?\.meta\.changes\) \{[\s\S]*code: "SEAT_CLAIMED"[\s\S]*return jsonError\("입장이 닫혔어요\. 선생님께 확인해 주세요\.", 403\)/);
  assert.doesNotMatch(join, /issueDeviceSession/);
  assert.match(route, /INSERT INTO device_sessions[^`]*WHERE EXISTS \(SELECT 1 FROM student_profiles s JOIN classrooms c ON c\.id = s\.classroom_id WHERE s\.id = \? AND s\.archived_at IS NULL AND c\.active = 1\)/);
  assert.match(route, /if \(!inserted\.meta\.changes\) return null/);
  assert.match(switchProfile, /const device = await issueDeviceSession\(candidate\.id\);[\s\S]*if \(!device\) return jsonError\("이 학급은 더 이상 이용할 수 없어요\. 선생님께 확인해 주세요\.", 403\)/);
  assert.match(recover, /const device = await issueDeviceSession\(student\.id\);[\s\S]*if \(!device\) return jsonError\("이 학급은 더 이상 이용할 수 없어요\. 선생님께 확인해 주세요\.", 403\)/);
  assert.equal((route.match(/const device = await issueDeviceSession\(/g) ?? []).length, 2);
  // 입장은 명단 번호로만 한다. 아이가 스스로 프로필을 만들던 경로는 남아 있으면 안 된다.
  assert.doesNotMatch(join, /allowDuplicate|PROFILE_EXISTS/);
  assert.match(join, /code: "NO_ROSTER"/);
});

test("join returns 403 without residue when the atomic classroom guard loses", async (context) => {
  const server = await sharedServer();
  context.after(() => resetDatabase(server.DB));

  const DB = server.DB;
  await DB.batch([
    DB.prepare("INSERT INTO teachers(id, email, display_name) VALUES ('teacher_race', 'race@example.com', 'Race')"),
    DB.prepare("INSERT INTO classrooms(id, teacher_id, display_name, class_code, join_token) VALUES ('class_race', 'teacher_race', 'Race class', '4999', 'join_race')"),
  ]);
  await seatRow(DB, "class_race").run();
  // 자리 차지는 INSERT가 아니라 UPDATE다 — 가드가 지는 상황을 UPDATE 트리거로 흉내 낸다.
  await DB.prepare("CREATE TRIGGER close_class_before_join BEFORE UPDATE ON student_profiles BEGIN SELECT RAISE(IGNORE); END").run();

  const response = await server.fetch("/api/student", joinRequest("203.0.113.41"));
  assert.equal(response.status, 403);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.deepEqual(await response.json(), { error: "입장이 닫혔어요. 선생님께 확인해 주세요." });
  assert.equal((await DB.prepare("SELECT claimed_at AS claimedAt FROM student_profiles").first()).claimedAt, null);
  for (const table of ["recovery_credentials", "device_sessions"]) assert.equal(await count(DB, table), 0, table);
});

test("profile switch and recovery return 403 when their atomic active-class guard loses", async (context) => {
  const server = await sharedServer();
  context.after(() => resetDatabase(server.DB));

  const DB = server.DB;
  await DB.batch([
    DB.prepare("INSERT INTO teachers(id, email, display_name) VALUES ('teacher_session_race', 'session-race@example.com', 'Session race')"),
    DB.prepare("INSERT INTO classrooms(id, teacher_id, display_name, class_code, join_token) VALUES ('class_session_race', 'teacher_session_race', 'Session race class', '4999', 'join_session_race')"),
  ]);
  await seatRow(DB, "class_session_race").run();

  const initialRequest = joinRequest("203.0.113.42");
  const initialBody = JSON.parse(initialRequest.body);
  const joined = await server.fetch("/api/student", initialRequest);
  assert.equal(joined.status, 201);
  const joinedPayload = await joined.json();
  await DB.batch([
    DB.prepare("UPDATE device_sessions SET revoked_at = CURRENT_TIMESTAMP"),
    DB.prepare("CREATE TRIGGER close_class_before_session BEFORE INSERT ON device_sessions BEGIN SELECT RAISE(IGNORE); END"),
  ]);

  const switchIp = "203.0.113.43";
  const switched = await server.fetch("/api/student", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": switchIp },
    body: JSON.stringify({ action: "switchProfile", studentId: joinedPayload.student.id, picturePassword: initialBody.picturePassword }),
  });
  assert.equal(switched.status, 403);
  assert.deepEqual(await switched.json(), { error: "이 학급은 더 이상 이용할 수 없어요. 선생님께 확인해 주세요." });
  assert.equal((await DB.prepare("SELECT COUNT(*) AS count FROM device_sessions WHERE revoked_at IS NULL").first()).count, 0);

  await DB.batch([
    DB.prepare("DROP TRIGGER close_class_before_session"),
    DB.prepare("UPDATE classrooms SET active = 1, admission_open = 0 WHERE id = 'class_session_race'"),
    DB.prepare("CREATE TRIGGER close_class_before_session BEFORE INSERT ON device_sessions BEGIN SELECT RAISE(IGNORE); END"),
  ]);
  const recoverIp = "203.0.113.44";
  const recovered = await server.fetch("/api/student", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": recoverIp },
    body: JSON.stringify({ action: "recover", classCode: "4999", seatNumber: initialBody.seatNumber, picturePassword: initialBody.picturePassword }),
  });
  assert.equal(recovered.status, 403);
  assert.deepEqual(await recovered.json(), { error: "이 학급은 더 이상 이용할 수 없어요. 선생님께 확인해 주세요." });
  assert.equal((await DB.prepare("SELECT COUNT(*) AS count FROM device_sessions WHERE revoked_at IS NULL").first()).count, 0);
});
