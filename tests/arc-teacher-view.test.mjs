import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

// AD-15 (응답 형상 금지, Story 3.2): 결석이 미완료 지표로 새어나가는 것을
// 서버 응답 형상 수준에서 막는다 — 필드가 없으면 UI가 쓸 수 없다.
test("교사·학생 응답에 진행률 집계 필드를 새로 만들지 않는다 (AD-15)", async () => {
  const [teacher, student, artworks] = await Promise.all([
    read("../app/api/teacher/route.ts"),
    read("../app/api/student/route.ts"),
    read("../app/api/artworks/route.ts"),
  ]);
  for (const [name, source] of [["teacher", teacher], ["student", student], ["artworks", artworks]]) {
    for (const forbidden of ["completedCount", "missingCount", "progressRate", "completionRate", "emptyPageCount"]) {
      assert.ok(!source.includes(forbidden), `${name} 라우트에 금지 집계 필드 ${forbidden}가 있다 (AD-15)`);
    }
  }
  // 조종석 arc 페이로드는 학급 포인터와 콘텐츠 크기(episodeCount)까지만 나른다 —
  // 아이별 빈 쪽 수·정렬 키를 싣지 않는다.
  assert.match(teacher, /arcId: arc\.arcId, title: arc\.title, episodeId: episode\.episodeId, episodeTitle: episode\.title, episodeIndex, episodeCount: arc\.episodes\.length/);
  // 기존 유지 자산(FR-31)은 그대로다 — 이 단언은 실수 제거를 막는 쪽으로 작동한다.
  assert.match(teacher, /artworkCount/);
});

test("아크 전환 컨트롤은 '되돌릴 수 없다'고 겁주지 않는다 — 정상 사용이다 (Story 3.3, FR-2a)", async () => {
  const teacher = await read("../app/components/TeacherApp.tsx");
  const cockpitStart = teacher.indexOf("function ArcCockpit");
  const cockpitEnd = teacher.indexOf("function ", cockpitStart + 10);
  const cockpit = teacher.slice(cockpitStart, cockpitEnd);
  assert.ok(cockpitStart >= 0);
  assert.doesNotMatch(cockpit, /되돌릴 수 없|confirm\(/, "아크 전환·재열기는 확인 대화상자 없이 즉시 — 되돌릴 수 있는 정상 동작");
  // 반대로 학급 삭제 문구는 AD-17에 따라 계속 사실을 말해야 한다 — 부드럽게 되돌리면 안 된다.
  assert.match(teacher, /되돌릴 수 없어요\. 학생 입장과 기존 로그인, 가족 공유가 즉시 끝나고/);
});

test("저장 경로는 채택된 완성 이미지 키를 지우지 않는다 (AD-6, Story 3.4)", async () => {
  const route = await read("../app/api/artworks/[id]/route.ts");
  // 성공 경로의 정리 호출: 옛 썸네일만 — 옛 완성 키 항목이 되살아나면 책 쪽이 백지가 된다.
  assert.match(route, /await removeCandidates\(\[thumbnailKey && artwork\.thumbnailKey !== thumbnailKey \? artwork\.thumbnailKey : null\]\);/);
  assert.doesNotMatch(route, /artwork\.finalImageKey !== finalKey \? artwork\.finalImageKey/,
    "옛 완성 키 삭제가 되살아났다 — docs/arc-book-contract.md 참조, 두 팀 합의 없이 금지");
  // 유일 제약 위반은 500이 아니라 분기 가능한 409다.
  assert.match(route, /EPISODE_ALREADY_COMPLETE/);
});

test("지난 이야기 서랍은 보기 전용이고 귀속 컬럼으로만 찾는다 (Story 3.1, AD-10·AD-11)", async () => {
  const [route, studio] = await Promise.all([
    read("../app/api/artworks/[id]/route.ts"),
    read("../app/components/DrawingStudio.tsx"),
  ]);
  // 서버: artworks 귀속 컬럼 조회 — 책·쪽 테이블 미사용, 시각 추론 미사용
  assert.match(route, /WHERE student_id = \? AND arc_id = \? AND id <> \?/);
  // 주석 속 언급은 허용 — 실제 SQL이 책 테이블을 만지는지만 본다.
  assert.doesNotMatch(route, /FROM storybook|JOIN storybook|INTO storybook/, "서랍 조회가 책 테이블을 거치면 안 된다 (AD-11)");
  // 회차 순서는 아크 상수가 정본 — episodes 배열 순서로 정렬
  assert.match(route, /arc\.episodes\s*\n?\s*\.filter/);
  // 클라이언트: 서랍 안 그림에 조작 어포던스 없음(보기 전용), 이미지는 소유권 검사 프록시 경유
  const drawerStart = studio.indexOf('className="episode-drawer"');
  assert.ok(drawerStart >= 0);
  const drawer = studio.slice(drawerStart, studio.indexOf("</aside>", drawerStart));
  assert.match(drawer, /\/api\/artworks\/\$\{encodeURIComponent\(episode\.id\)\}\/image/);
  assert.doesNotMatch(drawer, /onClick=\{[^}]*draw|href=/, "서랍 그림은 열리는 링크가 아니다 — 보기 전용");
});
