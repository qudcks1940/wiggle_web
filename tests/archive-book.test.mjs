import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

/* 내 그림 보관함을 펼친 책으로 (2026-09-20 사용자 시안).
 * 왼쪽은 그림 목록, 오른쪽은 고른 그림 한 장. 학생 홈이 없어져 이 화면이 도화지 밖의 유일한 자리다 —
 * 새 그림·그림책·수업 마치기로 가는 길이 여기서 끊기면 아이가 갈 곳이 없어진다. */

test("펼친 책 두 쪽으로 되어 있다", async () => {
  const source = await read("../app/components/Archive.tsx");
  assert.match(source, /className="archive-book-page-left archive-book-list"/);
  assert.match(source, /className="archive-book-page-right archive-book-view"/);
  // 공통 `.teacher-activity-book`은 가로세로 비율이 높이를 묶어 책이 화면을 못 채웠다.
  // 시안은 책이 화면을 가득 채우므로 보관함 전용 껍데기를 쓴다.
  assert.match(source, /className="archive-book"/);
  assert.doesNotMatch(source, /className="[^"]*teacher-activity-book/);
});

test("쪽 안의 칸 수와 자식 수가 맞는다", async () => {
  // 행을 자식보다 많게 잡으면 그림 칸이 0이 되고 단추가 늘어난다(2026-09-20 실측으로 겪음).
  const css = await read("../app/globals.css");
  assert.match(css, /\.archive-book-view \{ display:grid; grid-template-rows:auto minmax\(0,1fr\) auto;/);
  assert.match(css, /\.archive-book-list \{ display:grid; grid-template-rows:auto minmax\(0,1fr\) auto;/);
  // 그림은 자리를 채우되 자리를 넓히지 않는다 — 흐름에 두면 쪽 높이를 밀어낸다.
  assert.match(css, /\.archive-book-paper img \{ position:absolute; inset:0;/);
});

test("큰 쪽은 원본, 목록은 썸네일을 쓴다", async () => {
  const source = await read("../app/components/Archive.tsx");
  assert.match(source, /\$\{full \? "\?variant=final" : ""\}/);
  assert.match(source, /<ArtworkPreview artwork=\{selected\} full \/>/);
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

test("화면에 따라 쌓거나 펼친다", async () => {
  const css = await read("../app/globals.css");
  // 기본은 쌓기다(좁은 화면 먼저). 두 쪽을 나란히 두면 좁은 화면에서 둘 다 못 읽는다.
  assert.match(css, /\.archive-book \{[\s\S]{0,200}grid-template-columns:minmax\(0,1fr\);/);
  // 760px부터 펼친다 — 교실 주력 기기인 아이패드 세로(768·820)에서도 책으로 보여야 한다.
  assert.match(css, /@media \(min-width:760px\), \(orientation:landscape\) and \(max-height:560px\) and \(min-width:660px\) \{/);
  // 그 폭에서는 38:62, 넓어지면 32:68로 목록을 더 좁혀 그림에 자리를 준다.
  assert.match(css, /grid-template-columns:minmax\(0,38fr\) minmax\(0,62fr\); gap:0;/);
  assert.match(css, /@media \(min-width:1024px\) \{\n  \.archive-book \{ grid-template-columns:minmax\(0,32fr\) minmax\(0,68fr\); \}/);
  // 눕힌 기기는 세로가 귀하다 — 폭이 좁아도 펼치고 여백을 줄여 한 화면에 넣는다.
  assert.match(css, /@media \(orientation:landscape\) and \(max-height:560px\) \{/);
  // 쌓기에서는 목록을 잘라 그림과 단추가 한참 아래로 밀리지 않게 한다.
  assert.match(css, /@media \(max-width:759px\) \{\n  \.archive-book-list>ul \{ max-height:30vh; \}/);
});
