import assert from "node:assert/strict";
import test, { after } from "node:test";
import { provisionSchema } from "@/db/runtime";
import { createTestDb, resetRows } from "./harness/db.mjs";
import { startTestServer } from "./harness/server.mjs";

// 반 번호(출석번호)는 선택 입력·표시용 메타데이터다 — 이름은 수집하지 않는다 (P-001, 2026-09-07 결정).
let booting;
async function sharedServer() {
  if (!booting) booting = startTestServer();
  return booting;
}
after(async () => {
  if (booting) await booting.then((server) => server.dispose(), () => {});
});

async function seedClassroom(DB) {
  await DB.batch([
    DB.prepare("INSERT INTO teachers(id, email, display_name, credential_hash, credential_salt) VALUES ('teacher_cn', 'cn@test.invalid', '번호 선생님', '', '')"),
    DB.prepare("INSERT INTO classrooms(id, teacher_id, display_name, class_code, join_token) VALUES ('class_cn', 'teacher_cn', '번호 반', '4777', 'join_cn')"),
  ]);
}

function join(server, body) {
  return server.fetch("/api/student", {
    method: "POST", headers: { "content-type": "application/json", "x-vercel-forwarded-for": "203.0.113.77" },
    body: JSON.stringify({ action: "join", entry: "4777", animal: "🐰", picturePassword: ["⭐", "⭐", "⭐"], ...body }),
  });
}

test("반 번호를 입력하면 저장되고, 안 넣거나 이상하면 null — 입장은 막지 않는다", async () => {
  const server = await sharedServer();
  await resetRows(server.DB);
  await seedClassroom(server.DB);

  const withNumber = await join(server, { nickname: "번호화가", classNumber: 12 });
  assert.equal(withNumber.status, 201);
  const without = await join(server, { nickname: "무번호화가" });
  assert.equal(without.status, 201);
  // 형식이 어긋난 값(문자, 범위 밖)은 오류가 아니라 저장 생략이다 — 선택 필드가 입장을 막으면 안 된다.
  const garbage = await join(server, { nickname: "이상값화가", classNumber: "십이" });
  assert.equal(garbage.status, 201);
  const outOfRange = await join(server, { nickname: "백번화가", classNumber: 100 });
  assert.equal(outOfRange.status, 201);

  const rows = await server.DB.prepare("SELECT nickname, class_number AS classNumber FROM student_profiles ORDER BY nickname").all();
  assert.deepEqual(rows.results, [
    { nickname: "무번호화가", classNumber: null },
    { nickname: "백번화가", classNumber: null },
    { nickname: "번호화가", classNumber: 12 },
    { nickname: "이상값화가", classNumber: null },
  ]);
});

test("구세대 student_profiles 테이블에도 class_number가 조건부 ALTER로 붙는다 (AD-2)", async () => {
  const handle = await createTestDb({ provision: false });
  const db = handle.DB;
  await db.prepare(`CREATE TABLE student_profiles (id TEXT PRIMARY KEY NOT NULL, classroom_id TEXT NOT NULL, nickname TEXT NOT NULL, animal TEXT NOT NULL, last_activity_at TEXT NOT NULL, archived_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
  await provisionSchema(db);
  const columns = await db.prepare(`PRAGMA table_info(student_profiles)`).all();
  assert.ok(columns.results.some((column) => column.name === "class_number"), "구세대 테이블에 class_number가 ALTER로 붙어야 한다");
  await handle.dispose();
});

test("번호는 인증에 쓰이지 않고, 서버는 이름을 수집하지 않는다 (소스 계약)", async () => {
  const { readFile } = await import("node:fs/promises");
  const route = await readFile(new URL("../app/api/student/route.ts", import.meta.url), "utf8");
  // 재입장·중복 판정 어디에도 class_number가 조건으로 등장하지 않는다 — INSERT 한 곳뿐.
  const uses = route.match(/class_number/g) ?? [];
  assert.equal(uses.length, 1, "class_number는 INSERT 외의 SQL에 나타나면 안 된다 (인증·중복 판정 금지)");
  // 이름류 필드를 받는 코드가 생기면 P-001 결정 위반이다.
  assert.doesNotMatch(route, /realName|studentName|fullName/, "학생 이름 수집 금지 (제품 불변 원칙)");
});
