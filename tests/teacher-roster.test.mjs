import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseRosterText } from "../lib/roster.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

/* 교사 학급 명단(번호 + 실명)의 계약.
 * 가장 중요한 규칙: 실명은 담임 교사 화면에만 있고, 학생 화면·가족 공유·AI 요청에는 실리지 않는다.
 * 수업 코드는 인쇄물과 칠판에 적히는 값이라, 명단이 학생 응답에 섞이면 그 코드를 아는 사람에게
 * 반 전체 실명이 노출된다. */

test("명단 입력은 한 줄에 한 명씩 번호와 이름을 읽고, 구분자를 가리지 않는다", () => {
  const { entries, errors } = parseRosterText("1 김민준\n2. 이서연\n3,박지호\n4\t최하윤\n\n");
  assert.deepEqual(errors, []);
  assert.deepEqual(entries, [
    { seatNumber: 1, realName: "김민준" },
    { seatNumber: 2, realName: "이서연" },
    { seatNumber: 3, realName: "박지호" },
    { seatNumber: 4, realName: "최하윤" },
  ]);
});

test("명단 입력은 같은 번호와 빈 이름, 범위 밖 번호를 잡아낸다", () => {
  assert.match(parseRosterText("1 김민준\n1 이서연").errors[0], /1번이 두 번/);
  assert.match(parseRosterText("100 김민준").errors[0], /1~99/);
  // 이름 없이 번호만 있는 줄은 읽지 못한 줄로 잡는다.
  assert.equal(parseRosterText("7").entries.length, 0);
  assert.equal(parseRosterText("7").errors.length, 1);
});

test("서버는 명단 값을 스스로 검증한다 — 화면 검사만 믿지 않는다", async () => {
  const route = await read("../app/api/teacher/route.ts");
  assert.match(route, /const MAX_ROSTER_SIZE = 60;/);
  assert.match(route, /const MAX_SEAT_NUMBER = 99;/);
  assert.match(route, /function parseRoster\(value: unknown\)/);
  assert.match(route, /if \(!Number\.isInteger\(seatNumber\) \|\| seatNumber < 1 \|\| seatNumber > MAX_SEAT_NUMBER\)/);
  assert.match(route, /if \(seen\.has\(seatNumber\)\) return \{ error: `\$\{seatNumber\}번이 두 번 있어요\.` \}/);
  // 이미 쓰는 번호와 부딪히면 일부만 넣지 않고 통째로 거절한다.
  assert.match(route, /const clash = parsed\.entries\.find\(\(entry\) => used\.has\(entry\.seatNumber\)\)/);
});

test("새로 만든 자리는 아이가 들어오기 전까지 비어 있다", async () => {
  const route = await read("../app/api/teacher/route.ts");
  // claimed_at이 비어 있어야 그 번호를 아이가 처음 차지할 수 있다.
  assert.match(route, /INSERT INTO student_profiles\([^)]*entry_code, claimed_at[^)]*\) VALUES \([^)]*NULL/);
  // 아이 화면에 실명이 새지 않도록 자리표시 별명은 번호만 쓴다.
  assert.match(route, /`\$\{entry\.seatNumber\}번`/);
});

test("학생 응답에는 실명도 명단도 실리지 않는다", async () => {
  const student = await read("../app/api/student/route.ts");
  // entryStatus는 명단 학급인지만 알려 준다. 번호·이름 목록을 주지 않는다.
  assert.match(student, /SELECT 1 FROM student_profiles WHERE classroom_id = \? AND archived_at IS NULL AND seat_number IS NOT NULL LIMIT 1/);
  assert.match(student, /hasRoster: Boolean\(roster\)/);
  // 코드가 맞는 첫 입장은 "처음인지"만 준다. 번호·이름·코드 목록은 없다.
  assert.match(student, /return noStoreJson\(\{ classroomName: classroom\.displayName, firstTime: true \}\)/);
  // 학생 API 어디에서도 real_name을 고르지 않는다.
  assert.doesNotMatch(student, /real_name/);
});

test("자리 차지와 세션은 한 배치이고, 같은 코드는 두 번 차지되지 않는다", async () => {
  const student = await read("../app/api/student/route.ts");
  // 자리 차지·세션이 한 배치다. 나뉘면 중간 실패에서 아이가 영영 못 들어온다.
  assert.match(student, /const seatResults = await bindings\(\)\.DB\.batch\(\[[\s\S]*student_profiles[\s\S]*device_sessions[\s\S]*\]\)/);
  // 동시에 같은 코드로 들어와도 먼저 성공한 쪽만 자리를 갖는다.
  assert.match(student, /UPDATE student_profiles SET nickname = \?, animal = \?, claimed_at = \?, last_activity_at = \? WHERE id = \? AND claimed_at IS NULL/);
  assert.match(student, /INSERT INTO device_sessions[^`]*claimed_at = \?/);
});

test("코드 재입장은 학급 + 코드로만 찾고, 무차별 대입은 학급·IP 버킷이 막는다", async () => {
  const student = await read("../app/api/student/route.ts");
  assert.match(student, /if \(!\/\^\\d\{4\}\$\/\.test\(entryCode\)\)/);
  assert.match(student, /student-join-class:\$\{classroom\.id\}:\$\{requestIp\(request\)\}/);
  assert.match(student, /WHERE classroom_id = \? AND entry_code = \? AND archived_at IS NULL/);
  assert.doesNotMatch(student, /picture_hash|verifySecret|deriveSecret/);
});

test("학생 화면은 명단을 그리지 않고 자기 참여 코드만 입력한다", async () => {
  const join = await read("../app/components/JoinClient.tsx");
  assert.match(join, /className="entry-code-input"/);
  assert.match(join, /action: "join", entry, entryCode: codeInput/);
  // 서버가 명단을 주지 않으므로 화면에도 목록을 그릴 방법이 없다.
  assert.doesNotMatch(join, /realName|seatNumber|entryCodes/);
  // 재입장은 동물·별명을 다시 묻지 않는다 — 처음일 때만 동물 화면으로 간다.
  assert.match(join, /if \(data\.firstTime\) \{ setMode\("animal"\)/);
});

test("실명은 담임 교사 화면에만 나타난다", async () => {
  const [teacherRoute, teacherUi, css] = await Promise.all([
    read("../app/api/teacher/route.ts"),
    read("../app/components/TeacherApp.tsx"),
    read("../app/globals.css"),
  ]);
  // 교사 GET은 requireTeacher와 학급 소유 확인을 지난 뒤에만 실명을 싣는다.
  assert.match(teacherRoute, /s\.real_name AS realName/);
  assert.match(teacherRoute, /s\.entry_code AS entryCode/);
  assert.match(teacherUi, /student\.realName/);
  assert.match(teacherUi, /from "@\/lib\/roster"/);
  assert.match(teacherUi, /이름은 <b>선생님만<\/b> 봅니다/);
  assert.match(css, /\.student-roster-name \{/);
});

test("가족 공유와 AI 요청에는 실명이 실리지 않는다", async () => {
  const [family, coaching, aiRoute] = await Promise.all([
    read("../app/components/FamilyView.tsx"),
    read("../lib/openai-coaching.ts"),
    read("../app/api/ai/coaching/route.ts"),
  ]);
  for (const [name, source] of [["FamilyView", family], ["openai-coaching", coaching], ["ai/coaching route", aiRoute]]) {
    assert.doesNotMatch(source, /real_name|realName/, `${name}에 실명이 새면 안 된다`);
  }
});
