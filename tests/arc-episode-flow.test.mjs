import assert from "node:assert/strict";
import test, { after } from "node:test";
import { resetRows } from "./harness/db.mjs";
import { startTestServer } from "./harness/server.mjs";

// 서버 기동은 비싸므로 파일당 하나만 띄우고 테스트마다 행을 초기화한다 (student-join-atomic 패턴).
let booting;
async function sharedServer() {
  if (!booting) booting = bootServer();
  return booting;
}
async function bootServer() {
  const server = await startTestServer();
  const initialized = await server.fetch("/api/student", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "unsupported" }),
  });
  assert.equal(initialized.status, 400);
  return server;
}
after(async () => {
  if (booting) await booting.then((server) => server.dispose(), () => {});
});

async function seedClassroomWithEpisode(DB, { arcId = "bicycle-story", episodeId = "bicycle-begin" } = {}) {
  await DB.batch([
    DB.prepare("INSERT INTO teachers(id, email, display_name, credential_hash, credential_salt) VALUES ('teacher_arc', 'arc@test.invalid', '아크 선생님', '', '')"),
    DB.prepare(`INSERT INTO classrooms(id, teacher_id, display_name, class_code, join_token, current_arc_id, current_episode_id) VALUES ('class_arc', 'teacher_arc', '아크 반', '4999', 'join_arc', '${arcId}', '${episodeId}')`),
  ]);
}

async function joinStudent(server, nickname = "토끼화가") {
  const response = await server.fetch("/api/student", {
    method: "POST", headers: { "content-type": "application/json", "x-vercel-forwarded-for": "203.0.113.61" },
    body: JSON.stringify({ action: "join", entry: "4999", nickname, animal: "🐰", picturePassword: ["⭐", "⭐", "⭐"] }),
  });
  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.ok(payload.deviceToken);
  return payload;
}

function studentHeaders(token) {
  return { "content-type": "application/json", authorization: `Bearer ${token}` };
}

test("입장하면 태블릿이 오늘 회차를 알려준다 — 판별 신호는 포인터 유효성 하나 (FR-4, AD-14)", async () => {
  const server = await sharedServer();
  await resetRows(server.DB);
  await seedClassroomWithEpisode(server.DB);
  const { deviceToken } = await joinStudent(server);

  const home = await server.fetch("/api/student", { headers: studentHeaders(deviceToken) });
  const data = await home.json();
  assert.equal(data.todayEpisode?.arcTitle, "자전거 이야기");
  assert.equal(data.todayEpisode?.episodeId, "bicycle-begin");
  assert.ok(data.todayEpisode?.sceneText.length > 0);
  assert.equal(data.todayEpisodeArtwork, null);

  // 포인터가 무효하면(교사가 아직 아무것도 안 열었으면) todayEpisode는 null — 자유 그리기 폴백.
  // admission_open을 닫아도 판별에 영향이 없어야 한다(AD-14: 판별 근거가 아니다).
  await server.DB.prepare("UPDATE classrooms SET current_episode_id = NULL, admission_open = 0 WHERE id = 'class_arc'").run();
  const closed = await server.fetch("/api/student", { headers: studentHeaders(deviceToken) });
  const closedData = await closed.json();
  assert.equal(closedData.todayEpisode, null);
});

test("같은 회차를 두 기기에서 시작해도 작품은 하나다 — 재사용 우선 (Story 2.2, AD-3)", async () => {
  const server = await sharedServer();
  await resetRows(server.DB);
  await seedClassroomWithEpisode(server.DB);
  const { deviceToken } = await joinStudent(server);

  // 태블릿 두 대는 서로 다른 clientArtworkId를 만든다 — ON CONFLICT(id)로는 못 잡는 경합.
  const create = (clientArtworkId) => server.fetch("/api/artworks", {
    method: "POST", headers: studentHeaders(deviceToken),
    body: JSON.stringify({ arcId: "bicycle-story", episodeId: "bicycle-begin", clientArtworkId }),
  });
  const first = await (await create("artwork_tablet_one_000001")).json();
  const second = await (await create("artwork_tablet_two_000002")).json();
  assert.ok(first.artwork.id);
  assert.equal(second.artwork.id, first.artwork.id, "두 번째 기기는 기존 작품을 이어 써야 한다 — 새 행 금지");

  const count = await server.DB.prepare("SELECT COUNT(*) AS count FROM artworks").first();
  assert.equal(Number(count.count), 1);

  // 귀속·버전이 생성 시점에 고정됐는지 (AD-8·AD-10)
  const row = await server.DB.prepare("SELECT arc_id AS arcId, episode_id AS episodeId, arc_version AS arcVersion, learning_mode AS mode FROM artworks WHERE id = ?").bind(first.artwork.id).first();
  assert.deepEqual(row, { arcId: "bicycle-story", episodeId: "bicycle-begin", arcVersion: 1, mode: "free" });

  // 재입장(Story 2.2): 홈 응답이 기존 작품을 돌려줘 이어 열게 한다 — 빈 쪽 모드로 보내지 않는다.
  const home = await (await server.fetch("/api/student", { headers: studentHeaders(deviceToken) })).json();
  assert.equal(home.todayEpisodeArtwork?.id, first.artwork.id);
});

test("오프라인 큐가 며칠 뒤 flush돼도 회차 귀속은 생성 시점 그대로다 (AD-10, AD-19)", async () => {
  const server = await sharedServer();
  await resetRows(server.DB);
  await seedClassroomWithEpisode(server.DB);
  const { deviceToken } = await joinStudent(server);

  const created = await (await server.fetch("/api/artworks", {
    method: "POST", headers: studentHeaders(deviceToken),
    body: JSON.stringify({ arcId: "bicycle-story", episodeId: "bicycle-begin", clientArtworkId: "artwork_offline_queue_01" }),
  })).json();
  const artworkId = created.artwork.id;

  // 화요일의 저장이 큐에 남은 사이, 교사가 학급 포인터를 다음 회차로 옮겼다.
  await server.DB.prepare("UPDATE classrooms SET current_episode_id = 'bicycle-ride' WHERE id = 'class_arc'").run();

  // 목요일에 큐가 flush된다 — 저장 요청에는 회차 정보가 없고, 서버는 요청 시점 포인터로 재결정하면 안 된다.
  const save = await server.fetch(`/api/artworks/${artworkId}`, {
    method: "PUT", headers: studentHeaders(deviceToken),
    body: JSON.stringify({
      requestId: "flush_after_pointer_move_01",
      expectedRevision: created.artwork.revision,
      document: { schemaVersion: 1, rendererVersion: 1, size: 1024, ops: [] },
      currentStep: 0,
    }),
  });
  assert.equal(save.status, 200);

  const row = await server.DB.prepare("SELECT arc_id AS arcId, episode_id AS episodeId FROM artworks WHERE id = ?").bind(artworkId).first();
  assert.deepEqual(row, { arcId: "bicycle-story", episodeId: "bicycle-begin" }, "flush가 귀속을 bicycle-ride로 재결정하면 안 된다");
});
