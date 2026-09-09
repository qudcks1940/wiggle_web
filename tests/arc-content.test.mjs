import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ARCS, arcChecksum, arcById, episodeById, isValidArcEpisode } from "@/lib/arc-content";
import { validateDrawDocument } from "@/lib/drawing-model";
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
      // 회차 기본 형상은 { episodeId, title, sceneText, sceneImage } (Story 2.1).
      // 씨앗 선 커리큘럼(2026-09-09)의 선택 항목 seed·prompts·discussion만 더 올 수 있다.
      const required = ["episodeId", "sceneImage", "sceneText", "title"];
      const optional = ["seed", "prompts", "discussion"];
      const keys = Object.keys(episode);
      assert.deepEqual(keys.filter((key) => required.includes(key)).sort(), required, `${arc.arcId}/${episode.episodeId}`);
      assert.ok(keys.every((key) => required.includes(key) || optional.includes(key)), `${arc.arcId}/${episode.episodeId}: 알 수 없는 회차 항목 ${keys}`);
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

test("씨앗 선 회차는 지울 수 있는 유효한 획으로 도화지를 열고, 정답 점선이 아니다 (docs/curriculum-seed-plan.md)", async () => {
  const arc = arcById("seed-lines");
  assert.ok(arc, "씨앗 선 12회 아크가 있어야 한다");
  assert.equal(arc.episodes.length, 12);
  const seeded = arc.episodes.filter((episode) => episode.seed?.length);
  assert.equal(seeded.length, 11, "11회(다시 고른 씨앗)만 씨앗을 미리 심지 않는다");
  for (const episode of arc.episodes) {
    assert.ok(episode.sceneText.length <= 40, `${episode.episodeId}: 안내는 한 문장으로 짧게`);
    assert.ok((episode.prompts ?? []).every((prompt) => prompt.length <= 40), episode.episodeId);
    assert.equal((episode.discussion ?? []).length, 3, `${episode.episodeId}: 교실 토론 질문 3개`);
  }
  for (const episode of seeded) {
    assert.ok(episode.seed.every((points) => points.length >= 2), episode.episodeId);
    // 씨앗이 문서 검증을 통과하지 못하면 그 회차는 작품 생성 자체가 영구 실패한다.
    const document = validateDrawDocument({
      schemaVersion: 1, rendererVersion: 1, size: 1024, height: 640,
      ops: episode.seed.map((points, index) => ({
        opId: `op_seedcheck${index}`, clientOpId: `client_seedcheck${index}`, type: "stroke", at: "2026-01-01T00:00:00.000Z",
        tool: "pencil", color: "#2B4A33", width: 8, points: points.map(([x, y]) => ({ x, y, pressure: 0.5 })),
      })),
    });
    assert.ok(document, `${episode.episodeId}: 씨앗 선이 문서 검증을 통과해야 한다`);
    assert.equal(document.ops.length, episode.seed.length, episode.episodeId);
  }
  // 씨앗은 지우개로 지울 수 있는 보통의 획이어야 하므로 작품 생성 시점에 문서로 들어간다.
  const route = await read("../app/api/artworks/route.ts");
  assert.match(route, /seededDocument\(episode\.seed\)/);
  // 교실 토론 질문은 교사 화면에만 나간다 — 학생 응답(arc-session)에는 discussion을 싣지 않는다.
  const session = await read("../lib/arc-session.ts");
  assert.doesNotMatch(session, /discussion/);
});
