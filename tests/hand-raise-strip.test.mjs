import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

/* 손든 아이 호출 줄 (2026-09-20 사용자 결정).
 * 종전에는 손든 표시가 "오늘 수업" 탭 안에만 있어, 교사가 다른 탭에 있으면 아이가 불러도 몰랐다.
 * 이 시험은 "어느 탭에서나 보인다"는 성질을 코드에 묶어 둔다 — 탭 안으로 되돌아가면 기능이 없는 것과 같다. */

test("호출 줄은 탭 내용 바깥에 있어 세 탭에서 모두 보인다", async () => {
  const source = await read("../app/components/TeacherWorkspace.tsx");
  const strip = source.indexOf("<HandRaiseStrip students=");
  assert.ok(strip > 0, "호출 줄이 배치되어 있어야 한다");
  // 탭별 분기(`{tab === "today" &&` 등)보다 앞에 있어야 탭과 무관하게 렌더된다.
  const firstTabBranch = source.indexOf('{tab === "today" &&');
  assert.ok(firstTabBranch > 0);
  assert.ok(strip < firstTabBranch, "호출 줄이 탭 분기 안으로 들어가면 안 된다");
  // 탭 배지도 함께 둔다.
  assert.match(source, /className="tcw-tab-badge"/);
});

test("오래 기다린 아이가 먼저 오고, 시간은 서버 시계로 잰다", async () => {
  const [source, route] = await Promise.all([
    read("../app/components/TeacherWorkspace.tsx"),
    read("../app/api/teacher/route.ts"),
  ]);
  // 기본 학생 목록은 번호순이지만, 호출 줄은 손든 시각 오름차순이어야 한다.
  assert.match(source, /\.sort\(\(a, b\) => \(a\.handRaisedAt \?\? ""\)\.localeCompare\(b\.handRaisedAt \?\? ""\)\)/);
  // 교사 기기 시계가 틀어져도 "3분째"가 어긋나지 않게 서버 시각과의 차이를 뺀다.
  assert.match(source, /const skew = serverNow && clock \? clock - Date\.parse\(serverNow\) : 0;/);
  // 시계는 effect에서만 읽는다 — 렌더 중 Date.now()는 린트(react-hooks/purity)가 막는다.
  assert.match(source, /const update = \(\) => setClock\(Date\.now\(\)\);/);
  assert.match(route, /serverNow: new Date\(\)\.toISOString\(\)/);
});

test("넓은 화면은 칩 나열, 좁은 화면은 한 명 + 외 N명으로 접는다", async () => {
  const css = await read("../app/components/TeacherWorkspace.css");
  // 접는 기준은 CSS다. JS로 화면 폭을 재면 서버 렌더와 어긋난다.
  assert.match(css, /@media\(max-width:760px\)\{[\s\S]*\.tcw-hand-list>li:nth-child\(n\+2\)\{display:none\}/);
  assert.match(css, /@media\(min-width:761px\)\{[\s\S]*\.tcw-hand-list>li:nth-child\(n\+5\)\{display:none\}/);
  // 두 요약 배지는 서로 반대 화면에서만 보인다.
  assert.match(css, /\.tcw-hand-rest\{display:none\}/);
  // 손 내리기는 터치 목표를 지킨다.
  assert.match(css, /\.tcw-hand-lower\{min-height:44px;min-width:44px/);
});

test("소리 없이 읽히도록 인원만 알리고, 경과 시간은 알림에 넣지 않는다", async () => {
  const source = await read("../app/components/TeacherWorkspace.tsx");
  const live = source.slice(source.indexOf('aria-live="polite"'), source.indexOf('aria-live="polite"') + 90);
  // 10초마다 바뀌는 경과 시간이 aria-live에 들어가면 스크린 리더가 계속 읽는다.
  assert.match(live, /\{raised\.length\}명이 선생님을 불렀어요/);
  assert.doesNotMatch(live, /waitedLabel|분째/);
});

test("손 든 아이에게는 자동 몽그리가 끼어들지 않는다", async () => {
  const studio = await read("../app/components/DrawingStudio.tsx");
  assert.match(studio, /if \(conflictDraftRef\.current \|\| teacherViewing \|\| handRaised\) return false;/);
});
