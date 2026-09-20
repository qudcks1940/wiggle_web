import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

/* 내 그림 보관함을 펼친 책으로 (2026-09-20 사용자 시안).
 * 왼쪽은 그림 목록, 오른쪽은 고른 그림 한 장. 학생 홈이 없어져 이 화면이 도화지 밖의 유일한 자리다 —
 * 새 그림·그림책·수업 마치기로 가는 길이 여기서 끊기면 아이가 갈 곳이 없어진다. */

test("펼친 책 두 쪽으로 되어 있다", async () => {
  const source = await read("../app/components/Archive.tsx");
  assert.match(source, /className="book-page book-copy-page archive-book-list"/);
  assert.match(source, /className="book-page book-visual-page archive-book-view"/);
  // 책 껍데기는 저장소에 이미 있는 모양을 쓴다 — 같은 그림을 두 벌 만들지 않는다.
  assert.match(source, /className="teacher-activity-book archive-book"/);
});

test("도화지 밖으로 나가는 길이 모두 남아 있다", async () => {
  const source = await read("../app/components/Archive.tsx");
  assert.match(source, /href="\/student\/draw\/new\?mode=free"/, "새 그림");
  assert.match(source, /href="\/student\/books"/, "그림책");
  assert.match(source, /수업 마치기/);
});

test("고른 그림이 완성이면 다시 보기, 그리는 중이면 이어 그리기로 간다", async () => {
  const source = await read("../app/components/Archive.tsx");
  assert.match(source, /const drawing = selected\?\.status !== "complete";/);
  assert.match(source, /drawing \? `\/student\/draw\/\$\{selected\.id\}` : `\/student\/archive\/\$\{selected\.id\}`/);
  // 고른 것이 목록에서 사라져도 빈 화면이 되지 않는다.
  assert.match(source, /artworks\.find\(\(artwork\) => artwork\.id === selectedId\) \?\? artworks\[0\] \?\? null/);
});

test("좁은 화면에서는 두 쪽을 위아래로 쌓는다", async () => {
  const css = await read("../app/globals.css");
  const narrow = css.slice(css.indexOf(".archive-book.teacher-activity-book {"));
  // 두 쪽을 나란히 두면 좁은 화면에서 둘 다 못 읽는다.
  assert.match(narrow, /\.archive-book\.teacher-activity-book \{ grid-template-columns:minmax\(0,1fr\); padding:18px; \}/);
  // 시안에는 노란 책갈피 탭이 없다.
  assert.match(css, /\.archive-book\.teacher-activity-book:before,\.archive-book\.teacher-activity-book:after \{ display:none; \}/);
});
