import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { FsArtworksStore } from "../db/adapters/artworks-store.ts";
import { sha256 } from "../lib/token-crypto.ts";
import { resetRows } from "./harness/db.mjs";
import { startTestServer } from "./harness/server.mjs";

const ownerHeaders = { cookie: "wiggle_teacher=workspace_owner_session" };
const otherHeaders = { cookie: "wiggle_teacher=workspace_other_session" };
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9ioAAAAASUVORK5CYII=";
const thumbnail = `data:image/png;base64,${png}`;
let booting;
let imageDirectory;

async function sharedServer() {
  if (!booting) booting = (async () => {
    imageDirectory = await mkdtemp(path.join(tmpdir(), "wiggle-workspace-images-"));
    const images = new FsArtworksStore(imageDirectory);
    await images.put("workspace/real-thumbnail.png", Buffer.from(png, "base64"), { httpMetadata: { contentType: "image/png" } });
    const server = await startTestServer({ env: { ARTWORKS_FS_DIR: imageDirectory } });
    await server.fetch("/api/teacher");
    return server;
  })();
  return booting;
}

after(async () => {
  if (booting) await booting.then((server) => server.dispose(), () => {});
  if (imageDirectory) await rm(imageDirectory, { recursive: true, force: true });
});

async function seed() {
  const server = await sharedServer();
  const db = server.DB;
  await resetRows(db);
  await db.batch([
    db.prepare("INSERT INTO teachers(id, email, display_name, credential_hash, credential_salt) VALUES ('teacher_owner', 'owner@workspace.invalid', '담임', '', ''), ('teacher_other', 'other@workspace.invalid', '다른 교사', '', '')"),
    db.prepare("INSERT INTO teacher_sessions(token_hash, teacher_id, expires_at, last_used_at) VALUES (?, 'teacher_owner', '2099-01-01T00:00:00.000Z', CURRENT_TIMESTAMP), (?, 'teacher_other', '2099-01-01T00:00:00.000Z', CURRENT_TIMESTAMP)").bind(await sha256("workspace_owner_session"), await sha256("workspace_other_session")),
    db.prepare("INSERT INTO classrooms(id, teacher_id, display_name, class_code, join_token, active, current_arc_id, current_episode_id) VALUES ('class_workspace', 'teacher_owner', '우리 반', '5101', 'join_workspace', 1, 'bicycle-story', 'bicycle-begin'), ('class_other', 'teacher_other', '다른 반', '5102', 'join_other', 1, NULL, NULL), ('class_inactive', 'teacher_owner', '삭제한 반', '5103', 'join_inactive', 0, NULL, NULL)"),
    db.prepare("INSERT INTO student_profiles(id, classroom_id, seat_number, real_name, nickname, animal, last_activity_at, archived_at) VALUES ('student_one', 'class_workspace', 1, '김하나', '토끼화가', '🐰', '2026-09-09T01:00:00.000Z', NULL), ('student_two', 'class_workspace', 2, '이두리', '곰화가', '🐻', '2026-09-09T01:00:00.000Z', NULL), ('student_archived', 'class_workspace', 3, '보관학생', '보관별명', '🐸', '2026-09-09T01:00:00.000Z', '2026-09-09T01:00:00.000Z'), ('student_other', 'class_other', 1, '다른학생', '다른별명', '🦊', '2026-09-09T01:00:00.000Z', NULL), ('student_inactive', 'class_inactive', 1, '삭제학급학생', '삭제학급별명', '🐱', '2026-09-09T01:00:00.000Z', NULL)"),
  ]);
  return server;
}

async function artwork(server, { id, studentId = "student_one", classroomId = "class_workspace", arcId = "bicycle-story", episodeId = "bicycle-begin", updatedAt = "2026-09-09T02:00:00.000Z", status = "drawing", finalImage = false, withThumbnail = false }) {
  await server.DB.prepare("INSERT INTO artworks(id, student_id, classroom_id, title, topic, learning_mode, status, arc_id, episode_id, updated_at, completed_at, thumbnail_key, final_image_key) VALUES (?, ?, ?, ?, '이야기', 'free', ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, studentId, classroomId, `그림 ${id}`, status, arcId, episodeId, updatedAt, status === "complete" ? updatedAt : null, withThumbnail ? "workspace/real-thumbnail.png" : null, finalImage ? "workspace/real-thumbnail.png" : null).run();
}

async function archive(server, query = "") {
  const response = await server.fetch(`/api/teacher?classroomId=class_workspace&artworks=1${query}`, { headers: ownerHeaders });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  return response.json();
}

test("오늘 수업은 다른 회차의 최신 저장과 구별하고, 해당 회차 작품이 없으면 비워 둔다", async () => {
  const server = await seed();
  await artwork(server, { id: "artwork_current", status: "complete", finalImage: true });
  await artwork(server, { id: "artwork_later_save", episodeId: "bicycle-ride", updatedAt: "2026-09-09T03:00:00.000Z" });
  await artwork(server, { id: "artwork_only_previous", studentId: "student_two", episodeId: "bicycle-ride" });
  await artwork(server, { id: "artwork_hidden", studentId: "student_archived" });
  const response = await server.fetch("/api/teacher?classroomId=class_workspace", { headers: ownerHeaders });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.monitorScope, "episode");
  assert.deepEqual(data.students.map((student) => student.id), ["student_one", "student_two"]);
  const [first, second] = data.students;
  assert.equal(first.artworkId, "artwork_later_save", "기존 최신 작품 필드는 이력을 위해 그대로 둔다");
  assert.equal(first.sessionArtwork.id, "artwork_current");
  assert.equal(first.sessionArtwork.status, "complete");
  assert.equal(first.sessionArtwork.thumbnail, thumbnail, "별도 썸네일 없는 완성작은 실제 완성 이미지로 미리 본다");
  assert.equal(second.sessionArtwork, null, "다른 회차 그림을 오늘 그림으로 꾸며 표시하면 안 된다");
  assert.equal(data.archivedStudents[0].id, "student_archived", "삭제 명단은 별도 복원 목록에서만 제공한다");
});

test("회차를 정하지 않은 학급의 최신 작품 표시는 latest 범위를 명시한다", async () => {
  const server = await seed();
  await server.DB.prepare("UPDATE classrooms SET current_arc_id = NULL, current_episode_id = NULL WHERE id = 'class_workspace'").run();
  await artwork(server, { id: "artwork_latest", withThumbnail: true });
  const data = await (await server.fetch("/api/teacher?classroomId=class_workspace", { headers: ownerHeaders })).json();
  assert.equal(data.monitorScope, "latest");
  assert.equal(data.students[0].sessionArtwork.id, "artwork_latest");
  assert.equal(data.students[0].sessionArtwork.thumbnail, thumbnail);
  assert.equal(data.students[1].sessionArtwork, null);
});

test("작품 보관함은 소유 학급의 활성 명단만 조회하고 학생·아크·회차 필터와 실제 썸네일을 제공한다", async () => {
  const server = await seed();
  await artwork(server, { id: "artwork_begin", withThumbnail: true });
  await artwork(server, { id: "artwork_ride", episodeId: "bicycle-ride" });
  await artwork(server, { id: "artwork_second", studentId: "student_two" });
  await artwork(server, { id: "artwork_archived", studentId: "student_archived", arcId: "archived-secret", episodeId: "secret-episode" });
  await artwork(server, { id: "artwork_foreign", studentId: "student_other", classroomId: "class_other" });
  // Even a malformed historical record with a student from another room must not enter this room's archive.
  await artwork(server, { id: "artwork_mismatched", studentId: "student_other" });
  const all = await archive(server);
  assert.equal(all.total, 3);
  assert.deepEqual(all.artworks.map((entry) => entry.id).sort(), ["artwork_begin", "artwork_ride", "artwork_second"]);
  assert.deepEqual(all.episodes.map((episode) => episode.episodeId), ["bicycle-begin", "bicycle-ride"]);
  assert.ok(all.episodes.every((episode) => episode.arcTitle === "자전거 이야기"));
  assert.deepEqual(all.episodes.map((episode) => episode.episodeIndex), [1, 2]);
  const filtered = await archive(server, "&studentId=student_one&arcId=bicycle-story&episodeId=bicycle-begin");
  assert.equal(filtered.total, 1);
  assert.equal(filtered.artworks[0].id, "artwork_begin");
  assert.equal(filtered.artworks[0].studentId, "student_one");
  assert.equal(filtered.artworks[0].seatNumber, 1);
  assert.equal(filtered.artworks[0].realName, "김하나");
  assert.equal(filtered.artworks[0].thumbnail, thumbnail);
  assert.equal(filtered.artworks[0].imageKey, undefined);
  assert.equal(filtered.artworks[0].arcTitle, "자전거 이야기");
  assert.equal(filtered.artworks[0].episodeIndex, 1);
  assert.equal((await archive(server, "&arcId=unrelated-arc")).total, 0);
});

test("작품 페이지는 동시간 저장도 안정적으로 이어지고 새 작품이 생겨도 이미 본 그림을 반복하지 않는다", async () => {
  const server = await seed();
  for (const id of ["artwork_a", "artwork_b", "artwork_c", "artwork_d"]) await artwork(server, { id });
  const first = await archive(server, "&limit=2");
  assert.deepEqual(first.artworks.map((entry) => entry.id), ["artwork_d", "artwork_c"]);
  assert.equal(first.hasMore, true);
  assert.equal(typeof first.nextCursor, "string");
  await artwork(server, { id: "artwork_new", updatedAt: "2026-09-09T05:00:00.000Z" });
  const second = await archive(server, `&limit=2&cursor=${encodeURIComponent(first.nextCursor)}`);
  assert.deepEqual(second.artworks.map((entry) => entry.id), ["artwork_b", "artwork_a"]);
  assert.equal(second.hasMore, false);
  assert.equal(second.nextCursor, null);
  assert.equal(second.total, 5);
  const invalid = await server.fetch("/api/teacher?classroomId=class_workspace&artworks=1&cursor=not-a-cursor", { headers: ownerHeaders });
  assert.equal(invalid.status, 400);
});

test("작품·회차 목록은 다른 교사, 삭제한 학급, 삭제 학생 및 다른 반 학생의 접근을 거절한다", async () => {
  const server = await seed();
  await artwork(server, { id: "artwork_private", withThumbnail: true });
  for (const [url, headers, status] of [
    // localhost 테스트 서버는 무쿠키 요청을 로컬 교사로 자동 연결한다. 다른 소유자의
    // 학급은 그 경우에도 403으로 닫히며 아래 누출 방지 검사를 동일하게 통과해야 한다.
    ["/api/teacher?classroomId=class_workspace&artworks=1", {}, 403],
    ["/api/teacher?classroomId=class_workspace&artworks=1", otherHeaders, 403],
    ["/api/teacher?classroomId=class_inactive&artworks=1", ownerHeaders, 403],
    ["/api/teacher?classroomId=class_workspace&artworks=1&studentId=student_archived", ownerHeaders, 404],
    ["/api/teacher?classroomId=class_workspace&artworks=1&studentId=student_other", ownerHeaders, 404],
    ["/api/teacher?classroomId=class_workspace&studentId=student_archived", ownerHeaders, 404],
  ]) {
    const response = await server.fetch(url, { headers });
    assert.equal(response.status, status, url);
    const body = await response.json();
    assert.equal(body.artworks, undefined);
    assert.equal(body.episodes, undefined);
    assert.doesNotMatch(JSON.stringify(body), /김하나|workspace\/real-thumbnail/);
  }
});
