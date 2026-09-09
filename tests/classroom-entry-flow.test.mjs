import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("class code and QR resolve the same private classroom entry status without exposing a roster", async () => {
  const [route, join] = await Promise.all([
    read("../app/api/student/route.ts"),
    read("../app/components/JoinClient.tsx"),
  ]);
  assert.match(route, /action === "entryStatus"/);
  assert.match(route, /classroomForEntry\(entry\)/);
  assert.match(route, /hasProfiles: Boolean\(existing\)/);
  assert.doesNotMatch(route.slice(route.indexOf('action === "entryStatus"'), route.indexOf('action === "join"')), /nickname|studentCount|\.all</);
  assert.match(join, /action: "entryStatus", entry/);
  // 입장은 명단 번호로만 한다. 명단이 없으면 아이가 할 수 있는 일이 없어 안내 화면으로 간다.
  assert.match(join, /setMode\(data\.hasRoster \? "seat" : "noRoster"\)/);
  assert.match(join, /내 번호를 눌러요/);
  assert.doesNotMatch(join, /profile-grid|deviceProfiles|activeProfile/);
});

test("normal re-entry uses classroom-scoped animal, nickname and three pictures on every device", async () => {
  const [route, join] = await Promise.all([
    read("../app/api/student/route.ts"),
    read("../app/components/JoinClient.tsx"),
  ]);
  assert.match(join, /\{ action, entry, nickname, animal, picturePassword: pictures, \.\.\.seat \}/);
  assert.match(route, /payload\.entry \?\? payload\.classCode/);
  // 재입장 후보는 별명·동물이 아니라 번호 하나로 정해진다.
  assert.match(route, /WHERE s\.classroom_id = \? AND s\.seat_number = \? AND s\.archived_at IS NULL AND c\.active = 1/);
  assert.match(route, /code: "SEAT_CLAIMED"/);
  assert.doesNotMatch(join, /개인 QR|새 개인 QR|복구 카드 재발급|다른 기기에서 그렸다면 선생님/);
  const normalSubmit = join.slice(join.indexOf('const payload = action === "join"'), join.indexOf('const response = await fetch', join.indexOf('const payload = action === "join"')));
  assert.match(normalSubmit, /\{ action, entry, nickname, animal, picturePassword: pictures, \.\.\.seat \}/);
});

test("wide/tablet entry stays one screen and only phones or short viewports use three guided steps", async () => {
  const [join, css] = await Promise.all([
    read("../app/components/JoinClient.tsx"),
    read("../app/globals.css"),
  ]);
  assert.match(join, /type MobileStep = 1 \| 2 \| 3/);
  assert.match(join, /mobile-entry-progress/);
  // 한 화면 2열 입장 카드: 기존 601~900px에 더해 무대에서 제외된 세로 901~1024px도 맡는다 (2026-08-20 iPad 44px 실측).
  assert.match(css, /@media \(min-width:601px\) and \(min-height:601px\) and \(max-width:900px\), \(min-width:901px\) and \(max-width:1024px\) and \(min-height:601px\) and \(orientation:portrait\)/);
  assert.match(css, /grid-template-columns:minmax\(245px,42%\) minmax\(0,1fr\)/);
  assert.match(css, /@media \(max-width:600px\), \(max-height:600px\)/);
  assert.match(css, /\.join-step \{ display:none; \}/);
  assert.match(css, /\.join-step\.active \{ display:block; \}/);
});

test("teacher cards expose only the approved read-only profile facts", async () => {
  const [teacher, route] = await Promise.all([
    read("../app/components/TeacherApp.tsx"),
    read("../app/api/teacher/route.ts"),
  ]);
  for (const field of ["createdAt", "lastActivityAt", "artworkCount", "drawingArtworkCount", "completedArtworkCount", "duplicateNickname"]) {
    assert.match(route, new RegExp(field));
    assert.match(teacher, new RegExp(field));
  }
  assert.match(teacher, /같은 별명 있음/);
  assert.doesNotMatch(teacher, /복구 카드 재발급/);
  assert.doesNotMatch(teacher, /name="(?:realName|studentName|attendanceNumber)"/);
});

// allowDuplicate 중복 생성 분기는 기존 프로필의 그림 비밀번호와 대조한다.
// 이 분기가 복구(recover)와 같은 대상 버킷을 소비하지 않으면 복구 경로의
// 8회/15분 상한을 우회해 60회/10분씩 비밀번호 일치 여부(409 오라클)를 캘 수 있다.
/* "duplicate-credential probing shares the per-target recovery budget" 테스트는 은퇴했다(2026-09-07).
 * 그 공격은 별명으로 중복 프로필을 만들어 join을 비밀번호 오라클로 쓰는 것이었는데, 자기 등록 경로가
 * 사라져 더는 존재하지 않는다. 남은 표면(번호 단위 버킷, IP를 바꿔도 같은 버킷, 이미 찬 번호는
 * 비밀번호와 무관하게 409)은 tests/nickname-spacing.test.mjs가 실제 서버로 검증한다. */
