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
  // 입장은 명단의 참여 코드로만 한다. 명단이 없으면 아이가 할 수 있는 일이 없어 안내 화면으로 간다.
  assert.match(join, /setMode\(data\.hasRoster \? "code" : "noRoster"\)/);
  assert.match(join, /내 참여 코드를 눌러요/);
  assert.doesNotMatch(join, /profile-grid|deviceProfiles|activeProfile/);
});

test("re-entry on every device uses the same participation code — no pictures, no nickname typing", async () => {
  const [route, join] = await Promise.all([
    read("../app/api/student/route.ts"),
    read("../app/components/JoinClient.tsx"),
  ]);
  assert.match(join, /action: "join", entry, entryCode: codeInput/);
  // 재입장 후보는 별명·동물이 아니라 학급 + 참여 코드로 정해진다.
  assert.match(route, /WHERE classroom_id = \? AND entry_code = \? AND archived_at IS NULL/);
  assert.match(route, /code: "ENTRY_CODE"/);
  assert.doesNotMatch(join, /개인 QR|새 개인 QR|복구 카드 재발급|다른 기기에서 그렸다면 선생님|picturePassword/);
});

test("the code and animal screens reuse the keypad notebook and never scroll sideways", async () => {
  const [join, css] = await Promise.all([
    read("../app/components/JoinClient.tsx"),
    read("../app/components/EntryCheck.module.css"),
  ]);
  assert.match(join, /type Mode = "checking" \| "code" \| "animal" \| "noRoster"/);
  assert.match(join, /className=\{`code-card \$\{check\.pad\}`\}/);
  assert.match(join, /className=\{`animal-card \$\{check\.pad\}`\}/);
  assert.match(css, /\.pad \.display :global\(\.entry-code-input\)/);
  // 넓으면 5열, 좁은 수첩에서는 4열로 접혀 칩이 44px 아래로 내려가지 않는다.
  assert.match(css, /\.pad :global\(\.animal-choice-grid\) \{ display: grid; grid-template-columns: repeat\(auto-fit, minmax\(max\(44px, 18%\), 1fr\)\)/);
  // 2026-09-13: 고정 비율 무대를 버리고 배경을 화면에 꽉 채웠다. 무대가 내용 폭으로
  // 줄어 가운데 뭉치던 문제(2026-09-09)는 무대를 가운데 세로 흐름으로 못 박아 막는다.
  assert.match(css, /\.stage \{[^}]*display: flex;[^}]*flex-direction: column;[^}]*align-items: center;/s);
  assert.doesNotMatch(css, /aspect-ratio: 1672 \/ 941|aspect-ratio: 1690 \/ 931/);
  assert.match(css, /background: var\(--paper\) url\("\/entry-green\/classroom-with-mongri\.webp"\) center bottom \/ cover no-repeat;/);
  // 세로로 긴 화면은 cover가 오리를 자르므로 크림 배경 + 독립 오리로 돌아간다.
  assert.match(css, /@media \(max-aspect-ratio: 5\/4\) \{\s*\.shell, \.seatShell \{ background-image: none; \}/);
  assert.match(css, /\.pad \{ position: relative; inset: auto; \}/);
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
