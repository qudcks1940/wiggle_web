import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ARCS, arcChecksum, episodeById, isValidArcEpisode } from "@/lib/arc-content";
import { provisionSchema } from "@/db/runtime";
import { createTestDb } from "./harness/db.mjs";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("아크 콘텐츠를 고치면 버전을 올려야 한다 — 체크섬 불일치는 버전 올림 누락이다 (AD-8)", () => {
  for (const arc of ARCS) {
    assert.equal(
      arcChecksum(arc),
      arc.contentChecksum,
      `${arc.arcId}: 회차 문안이 바뀌었는데 version(${arc.version})·contentChecksum이 그대로다. ` +
        `version을 올리고 contentChecksum을 arcChecksum() 결과로 갱신할 것.`,
    );
  }
});

test("회차는 안정 episodeId로 식별되고 회차 수는 아크마다 자유다 (FR-1, AD-8)", () => {
  assert.ok(ARCS.length >= 1, "검증용 아크가 최소 1개 있어야 한다");
  for (const arc of ARCS) {
    assert.ok(arc.episodes.length >= 2, `${arc.arcId}: 현장 검증에는 최소 2회차가 필요하다`);
    const ids = arc.episodes.map((episode) => episode.episodeId);
    assert.equal(new Set(ids).size, ids.length, `${arc.arcId}: episodeId가 중복된다`);
    for (const episode of arc.episodes) {
      // 회차 형상은 { episodeId, title, sceneText, sceneImage } 뿐이다 (Story 2.1)
      assert.deepEqual(Object.keys(episode).sort(), ["episodeId", "sceneImage", "sceneText", "title"]);
      assert.ok(episode.title.length > 0 && episode.sceneText.length > 0);
    }
  }
});

test("알 수 없는 아크·회차는 검증에서 거부된다 — 기본값 대체 없음 (Story 2.1)", () => {
  assert.equal(isValidArcEpisode("bicycle-story", "bicycle-begin"), true);
  assert.equal(isValidArcEpisode("bicycle-story", "no-such-episode"), false);
  assert.equal(isValidArcEpisode("no-such-arc", "bicycle-begin"), false);
  assert.equal(episodeById("bicycle-story", null), undefined);
});

test("setEpisode 라우트는 검증 실패를 400으로 거부하고 소유권 WHERE를 강제한다 (소스 계약)", async () => {
  const route = await read("../app/api/teacher/route.ts");
  assert.match(route, /action === "setEpisode"/);
  assert.match(route, /isValidArcEpisode\(arcId, episodeId\)/);
  assert.match(route, /목록에 있는 아크와 회차를 골라 주세요/);
  const mutations = await read("../lib/teacher-classroom-mutations.ts");
  assert.match(mutations, /UPDATE classrooms SET current_arc_id = \?, current_episode_id = \?, updated_at = CURRENT_TIMESTAMP WHERE id = \? AND teacher_id = \? AND active = 1/);
});

test("기존 운영 classrooms 테이블에도 포인터 컬럼이 조건부 ALTER로 붙는다 (AD-2)", async () => {
  // 운영 시나리오 재현: 포인터 컬럼이 없던 구세대 classrooms 테이블을 먼저 만들어 두면
  // CREATE TABLE IF NOT EXISTS는 그것을 건드리지 못한다 — provisionSchema의 ALTER 분기가 유일한 경로다.
  const handle = await createTestDb({ provision: false });
  const db = handle.DB;
  await db.prepare(`CREATE TABLE classrooms (id TEXT PRIMARY KEY NOT NULL, teacher_id TEXT NOT NULL, display_name TEXT NOT NULL, class_code TEXT NOT NULL UNIQUE, join_token TEXT NOT NULL UNIQUE, admission_open INTEGER NOT NULL DEFAULT 1, active INTEGER NOT NULL DEFAULT 1, current_activity TEXT NOT NULL DEFAULT '자유롭게 그리기', starts_at TEXT, ends_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
  await provisionSchema(db);
  const columns = await db.prepare(`PRAGMA table_info(classrooms)`).all();
  const names = columns.results.map((column) => column.name);
  assert.ok(names.includes("current_arc_id"), "구세대 테이블에 current_arc_id가 ALTER로 붙어야 한다");
  assert.ok(names.includes("current_episode_id"), "구세대 테이블에 current_episode_id가 ALTER로 붙어야 한다");
  await handle.dispose();
});
