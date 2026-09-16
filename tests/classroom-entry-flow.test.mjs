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
  // QR로 채운 코드는 상태 반영 전에 제출되므로 코드를 인자로 받는다. 기본값은 여전히 키패드 입력이다.
  assert.match(join, /action: "join", entry, entryCode: code,/);
  assert.match(join, /async function submit\(chosenAnimal = "", code = codeInput\)/);
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
  // 친구 고르기는 2026-09-13 시안대로 수첩이 아니라 카드 격자다(넓으면 5열, 휴대폰 2열).
  // 2026-09-14 20종: 격자 한 장이 한 쪽이고, 쪽들은 가로 스냅 스크롤 상자 안에 있다(가로 넘침은 상자 안에서만).
  assert.match(join, /<div key=\{pageIndex\} className=\{check\.pickGrid\}/);
  assert.match(css, /\.pickGrid \{ flex: 0 0 100%;[^}]*scroll-snap-align: start;[^}]*grid-template-columns: repeat\(5, minmax\(0, 1fr\)\);/);
  assert.match(css, /\.pickPages \{[^}]*overflow-x: auto;[^}]*scroll-snap-type: x mandatory;/);
  assert.match(css, /@media \(max-width: 700px\) \{[^}]*\.pickTop \{ position: static;[\s\S]*?\.pickGrid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
  assert.match(css, /\.pad \.display :global\(\.entry-code-input\)/);
  assert.doesNotMatch(css, /animal-choice-grid|emoji-chip/);
  // 2026-09-13: 고정 비율 무대를 버리고 배경을 화면에 꽉 채웠다. 무대가 내용 폭으로
  // 줄어 가운데 뭉치던 문제(2026-09-09)는 무대를 가운데 세로 흐름으로 못 박아 막는다.
  assert.match(css, /\.stage \{[^}]*display: flex;[^}]*flex-direction: column;[^}]*align-items: center;/s);
  assert.doesNotMatch(css, /aspect-ratio: 1672 \/ 941|aspect-ratio: 1690 \/ 931/);
  // 배경에는 '늘어나도 되는 것'만 둔다 — 평평한 벽과 가로로만 늘어나는 바닥 띠.
  assert.match(css, /background: var\(--wall\);/);
  assert.doesNotMatch(css, /classroom-with-mongri\.webp|classroom-notepad\.webp/);
  // 문·화분·이젤은 독립 장식이고, 바닥 띠와 같은 배율(--sceneH)을 써야 걸레받이가 어긋나지 않는다.
  // 문구 카드는 항상 가운데다. 장면은 카드 옆 남는 폭에 몽그리가 들어가도록 줄어든다(태블릿 기준).
  assert.match(css, /--sceneH: min\(72vh, 700px, calc\(\(50vw - 230px - 28px\) \* 881 \/ 754\)\);/);
  assert.doesNotMatch(css, /padding-left: calc\(var\(--sceneH\)/);
  assert.match(css, /height: calc\(var\(--sceneH\) \* 179 \/ 881\);/);
  assert.match(css, /\.sceneryLeft \{ left: 0; height: var\(--sceneH\); \}/);
  assert.match(css, /\.sceneryRight \{ right: 0; height: calc\(var\(--sceneH\) \* 571 \/ 881\); \}/);
  // 좁은 화면에서는 장식을 내려놓는다(대문의 .gallery-leaves와 같은 규칙).
  assert.match(css, /@media \(max-width: 999px\), \(max-height: 599px\) \{\s*\.scenery \{ display: none; \}/);
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

test("아직 준비 중 화면은 사용자 시안대로 카드 없이 몽그리·문구·버튼만 둔다", async () => {
  const [join, css] = await Promise.all([
    read("../app/components/JoinClient.tsx"),
    read("../app/components/EntryCheck.module.css"),
  ]);
  const ready = join.slice(join.indexOf("// 명단이 아직 없는 반"), join.lastIndexOf("</main>;"));
  assert.match(ready, /<h1 id="ready-title" className=\{check\.readyTitle\}>아직 준비 중이에요<\/h1>/);
  assert.match(ready, /선생님이 우리 반 명단을 넣으면<br \/>내 참여 코드로 들어올 수 있어요\./);
  assert.match(ready, /다시 확인하기/);
  assert.match(ready, /href="\/">수업 코드 다시 입력하기/);
  // 종전 카드형(entry-card)은 쓰지 않는다.
  assert.doesNotMatch(ready, /entry-card|entry-check-card/);
  // 몽그리 그림은 불투명이라 배경색이 그림과 같아야 경계가 보이지 않는다.
  assert.match(ready, /src="\/entry-green\/peek-mongri\.webp"/);
  assert.match(css, /\.readyShell \{[^}]*background: #fefaea;/);
  assert.match(css, /\.readyRetry \{[^}]*background: #fbce4d;[^}]*box-shadow: 0 clamp\(4px, 0\.4vw, 7px\) 0 #dcab33;/);
});
