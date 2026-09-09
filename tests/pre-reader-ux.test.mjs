import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [join, home, studio, css, messageCenter] = await Promise.all([
  read("../app/components/JoinClient.tsx"),
  read("../app/components/StudentHome.tsx"),
  read("../app/components/DrawingStudio.tsx"),
  read("../app/globals.css"),
  read("../app/components/StudentMessageCenter.tsx"),
]);
const animalPortraits = await readFile(new URL("../public/brand/animal-portraits-v2.png", import.meta.url));

test("child prompts stay readable as text — the listen button was removed on 2026-09-09", () => {
  for (const source of [join, home, studio, messageCenter]) assert.doesNotMatch(source, /SpeakButton/);
  assert.doesNotMatch(css, /speak-button/);
  assert.match(home, /<h1>오늘은 무엇을 그릴까\?<\/h1>/);
  // 2026-08-18 사용자 결정: 열기 버튼 아이콘은 💌 — 👩‍🏫 ZWJ 시퀀스는 Windows에서 깨져 보이고
  // "무엇을 여는 버튼인지"가 읽히지 않았다. 배너·이력 안의 👩‍🏫(말하는 주체 표시)는 유지한다.
  assert.match(messageCenter, /className="teacher-message-icon" aria-hidden="true">💌<\/span>/);
  assert.match(messageCenter, /<b>👩‍🏫 선생님<\/b>/);
  assert.doesNotMatch(messageCenter, /📬/);
});

test("entry can be completed with pictures and a generated nickname instead of reading and typing every field", () => {
  assert.match(join, /\{ value: "꽃", picture: "🌸", name: "꽃" \}/);
  assert.match(join, /\{ value: "집", picture: "🏠", name: "집" \}/);
  assert.match(join, /className="password-slots"/);
  assert.match(join, /pictures\[index\] \? pictureFor\(pictures\[index\]\) : "\?"/);
  assert.match(join, /function suggestNickname\(\)/);
  assert.match(join, /🎲 다른 별명/);
  assert.match(join, /className="button primary full child-primary-action"/);
  assert.match(join, /<span aria-hidden="true">▶️<\/span>/);
  assert.doesNotMatch(join, /이 기기에 저장된 내 동물 고르기/);
  assert.match(join, /className="animal-choice-portrait" data-animal-index=\{index\}/);
  assert.match(join, /className="join-preview-animal" data-animal-index=\{ANIMALS\.indexOf\(animal\)\}/);
  assert.match(join, /className="join-preview-password-title" aria-hidden="true">그림 비밀번호<\/span>/);
  assert.match(join, /<span className=\{pictures\[index\] \? "filled" : ""\} key=\{index\}><i>/);
  assert.match(css, /background-image:url\('\/brand\/animal-portraits-v2\.png'\)/);
  assert.match(css, /\.entry-join-shell>\.join-card \.join-preview-card>b \{[\s\S]*?display:grid;[\s\S]*?place-items:center;/);
  assert.match(css, /\.entry-join-shell>\.join-card \.join-preview-slots span \{[\s\S]*?border:0;[\s\S]*?background:transparent;/);
  assert.match(css, /\.entry-join-shell>\.join-card \.join-preview-slots span>i \{[\s\S]*?place-items:center;[\s\S]*?transform:none;/);
  assert.match(css, /\.entry-join-shell \.join-controls \.picture-password-picker \{[\s\S]*?position:static;[\s\S]*?display:grid;/);
  assert.match(css, /\.entry-join-shell \.join-controls \.join-step-2::before,[\s\S]*?\.join-step-3::before \{[\s\S]*?background:#d0e2d3;/);
  assert.match(css, /\.entry-join-shell \.join-controls \.picture-password-picker \.password-actions \{[\s\S]*?position:static;[\s\S]*?grid-column:2;[\s\S]*?grid-row:2;/);
  const portraitSheetWidth = animalPortraits.readUInt32BE(16);
  const portraitSheetHeight = animalPortraits.readUInt32BE(20);
  assert.equal(portraitSheetWidth, 2560);
  assert.equal(portraitSheetHeight, 1024);
  assert.equal(portraitSheetWidth / 5, portraitSheetHeight / 2, "each animal sprite cell must stay square");
});

test("drawing, navigation and reflection retain familiar visual actions when text is not understood", () => {
  assert.match(home, /<span aria-hidden="true">✏️<\/span>[\s\S]*<h2>이어 그리기<\/h2>/);
  assert.match(home, /<span aria-hidden="true">🖼️<\/span>[\s\S]*<h2>내 그림<\/h2>/);
  // 활동 고르기는 레슨 철거(Story 2.4)와 함께 사라졌다. 수업이 닫혀 있으면 자유 그리기 카드가 그 자리를 맡는다.
  assert.match(home, /🎨 자유롭게 그리기/);
  assert.match(home, /<h2 id="free-draw-title">내 마음 그림<\/h2>/);
  // 시작 버튼 문구: 회차 카드(재입장 분기)와 자유 그리기 카드 양쪽 모두 ▶️ 표지를 유지한다.
  assert.match(home, /<span aria-hidden="true">▶️<\/span>/);
  assert.match(home, /"내 그림 다시 보기" : "이어 그리기"/);
  // 회차 이동 표지. 단계 가이드 은퇴(2026-09-09) 뒤에는 수업 단계 이동만 남는다.
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
  assert.match(css, /\.password-slots span \{[^}]*width:52px; height:52px/);
  assert.match(css, /\.reflection-choice-grid button \{[^}]*min-height:84px/);
  // `.welcome-title-row` 규칙은 어떤 화면도 렌더링하지 않는 죽은 CSS라 함께 제거했다.
  assert.match(css, /@media \(max-width:460px\) and \(orientation:portrait\)[\s\S]*\.lesson-spoken-prompt \{ grid-column:1; grid-row:1; grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /\.reflection-choice-grid \{ display:grid; grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(home, /className="student-home-intro"[\s\S]*<h1>오늘은 무엇을 그릴까\?<\/h1>/);
  // 오늘 회차 카드(FR-4)가 그림책형 레슨 카드를 대체했다 — 삽화 자리 + 제목 + 장면 문장 + 큰 시작 버튼.
  assert.match(home, /className="today-episode-card"[\s\S]*today-episode-scene-text[\s\S]*child-primary-action/);
  assert.match(css, /\.teacher-activity-book \{[^}]*grid-template-columns:minmax\(0,1fr\) 46px minmax\(0,1fr\);/);
  assert.match(css, /\.student-tool-shelf \{[^}]*border:4px solid #d4a25d/);
  assert.match(css, /@media \(max-width:720px\)[\s\S]*\.teacher-activity-book \{[^}]*grid-template-columns:1fr/);
});
