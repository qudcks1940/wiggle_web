import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [join, entry, archive, studio, css, messageCenter, entryCss] = await Promise.all([
  read("../app/components/JoinClient.tsx"),
  read("../app/components/StudentEntry.tsx"),
  read("../app/components/Archive.tsx"),
  read("../app/components/DrawingStudio.tsx"),
  read("../app/globals.css"),
  read("../app/components/StudentMessageCenter.tsx"),
  read("../app/components/EntryCheck.module.css"),
]);
const animalPortraits = await readFile(new URL("../public/brand/animal-portraits-v2.png", import.meta.url));

test("child prompts stay readable as text — the listen button was removed on 2026-09-09", () => {
  for (const source of [join, entry, archive, studio, messageCenter]) assert.doesNotMatch(source, /SpeakButton/);
  assert.doesNotMatch(css, /speak-button/);
  // 2026-08-18 사용자 결정: 열기 버튼 아이콘은 💌 — 👩‍🏫 ZWJ 시퀀스는 Windows에서 깨져 보이고
  // "무엇을 여는 버튼인지"가 읽히지 않았다. 배너·이력 안의 👩‍🏫(말하는 주체 표시)는 유지한다.
  assert.match(messageCenter, /className="teacher-message-icon" aria-hidden="true">💌<\/span>/);
  assert.match(messageCenter, /<b>👩‍🏫 선생님<\/b>/);
  assert.doesNotMatch(messageCenter, /📬/);
});

test("entry can be completed with a number pad and one animal picture instead of reading and typing every field", () => {
  assert.match(join, /<h1>내 참여 코드를 눌러요<\/h1>/);
  assert.match(join, /<p>선생님이 준 네 자리 숫자예요\.<\/p>/);
  assert.match(join, /<h1>내 동물을 골라요<\/h1>/);
  assert.match(join, /<p>처음 왔구나! 하나만 고르면 돼요\.<\/p>/);
  assert.match(join, /className=\{`\$\{check\.enter\} child-primary-action`\}/);
  assert.match(join, /className="animal-choice-portrait" data-animal-index=\{index\}/);
  assert.doesNotMatch(join, /이 기기에 저장된 내 동물 고르기|picturePassword|nickname-row/);
  assert.match(css, /background-image:url\('\/brand\/animal-portraits-v2\.png'\)/);
  const portraitSheetWidth = animalPortraits.readUInt32BE(16);
  const portraitSheetHeight = animalPortraits.readUInt32BE(20);
  assert.equal(portraitSheetWidth, 2560);
  assert.equal(portraitSheetHeight, 1024);
  assert.equal(portraitSheetWidth / 5, portraitSheetHeight / 2, "each animal sprite cell must stay square");
});

test("drawing, navigation and reflection retain familiar visual actions when text is not understood", () => {
  // 커리큘럼 은퇴(2026-09-12): 홈이 사라지고 아이는 바로 도화지로 간다. 도화지 밖의
  // 자리는 내 그림 하나뿐이라, 거기서 새 그림·그림책·수업 마치기를 그림 표지로 고른다.
  assert.match(entry, /도화지를 펴는 중/);
  assert.match(archive, /<span aria-hidden="true">🎨<\/span>새 그림/);
  assert.match(archive, /<span aria-hidden="true">📘<\/span>그림책/);
  assert.match(archive, /<span aria-hidden="true">🚪<\/span>\{leaving \? "나가는 중…" : "수업 마치기"\}/);
  assert.match(studio, /⬅️ 이전/);
  assert.match(studio, /step === lesson\.steps\.length - 1 \? "⭐" : "➡️"/);
  assert.match(studio, /favoritePartChoices/);
  assert.match(studio, /FAVORITE_REASON_CHOICES/);
  assert.match(studio, /className="reflection-choice-grid"/);
  assert.match(studio, /정답이 아니에요\. 네가 보고 직접 골라요\./);
  assert.match(studio, /<span aria-hidden="true">\{completionState === "saving" \? "⏳" : "⭐"\}<\/span>/);
  assert.match(studio, /"작품 완성"/);
});

test("picture slots and choice controls remain large and visible on small screens", () => {
  assert.match(css, /\.student-message-button \.teacher-message-icon \{[^}]*font-size:26px/);
  // 그림 비밀번호 슬롯(.password-slots)은 참여 코드 입장(2026-09-09)과 함께 사라졌다. 코드 수첩의 키는 EntryCheck.module.css가 44px 이상으로 잡는다.
  assert.match(entryCss, /\.key \{ min-height: 56px; font-size: 24px; \}/);
  assert.match(css, /\.reflection-choice-grid button \{[^}]*min-height:84px/);
  // `.welcome-title-row` 규칙은 어떤 화면도 렌더링하지 않는 죽은 CSS라 함께 제거했다.
  assert.match(css, /@media \(max-width:460px\) and \(orientation:portrait\)[\s\S]*\.lesson-spoken-prompt \{ grid-column:1; grid-row:1; grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /\.reflection-choice-grid \{ display:grid; grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  // 내 그림 헤더의 행동은 좁은 화면에서도 44px을 지킨다.
  assert.match(css, /\.archive-actions \.button,\.archive-actions \.small-button \{ min-height:44px; \}/);
});
