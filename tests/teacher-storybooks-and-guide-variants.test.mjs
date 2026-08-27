import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { startTestServer } from "./harness/server.mjs";
import { sha256 } from "../lib/token-crypto.ts";
import { emptyStorybookDocument } from "../lib/storybook-model.ts";
import { GUIDED_LESSON_VARIANT_COUNT, guideMarksForVariant } from "../lib/lesson-guide-variants.ts";
import { LESSONS } from "../lib/lesson-content.ts";

function token(prefix) {
  return `${prefix}_${randomUUID().replaceAll("-", "")}`;
}

function allCoordinates(mark) {
  if (mark.kind === "line" || mark.kind === "curve") return mark.points.flat();
  if (mark.kind === "ellipse") return [mark.x, mark.y, mark.x - mark.rx, mark.x + mark.rx, mark.y - mark.ry, mark.y + mark.ry];
  return [mark.x, mark.y, mark.x + mark.width, mark.y + mark.height];
}

async function expectStatus(response, status) {
  if (response.status !== status) assert.fail(`expected ${status}, received ${response.status}: ${await response.text()}`);
  return response;
}

test("모든 따라 그리기 활동은 네 가지 고정 가이드를 안전한 좌표로 제공한다", () => {
  const guided = LESSONS.filter((lesson) => lesson.mode === "guided");
  assert.equal(GUIDED_LESSON_VARIANT_COUNT, 4);
  assert.ok(guided.length >= 10);
  for (const lesson of guided) {
    const variants = Array.from({ length: GUIDED_LESSON_VARIANT_COUNT }, (_, index) => guideMarksForVariant(lesson, index));
    assert.equal(new Set(variants.map((value) => JSON.stringify(value))).size, GUIDED_LESSON_VARIANT_COUNT, `${lesson.slug}: variants`);
    for (const marks of variants) {
      assert.equal(marks.length, lesson.guide.length, `${lesson.slug}: mark count`);
      assert.deepEqual([...new Set(marks.map((mark) => mark.step))], [...new Set(lesson.guide.map((mark) => mark.step))], `${lesson.slug}: steps`);
      for (const coordinate of marks.flatMap(allCoordinates)) {
        assert.ok(Number.isFinite(coordinate) && coordinate >= 0 && coordinate <= 1, `${lesson.slug}: ${coordinate}`);
      }
    }
  }
});

test("강아지 가이드는 얼굴 특징을 겹치지 않고 귀를 머리 바깥에 둔다", () => {
  const lesson = LESSONS.find((item) => item.slug === "friendly-dog");
  for (let variant = 0; variant < GUIDED_LESSON_VARIANT_COUNT; variant += 1) {
    const marks = guideMarksForVariant(lesson, variant);
    const eyes = marks.filter((mark) => mark.step === 3 && mark.kind === "ellipse").slice(0, 2);
    assert.equal(eyes.length, 2, `variant ${variant}: 두 눈`);
    assert.ok(eyes.every((eye) => eye.rx <= 0.025 && eye.ry <= 0.03), `variant ${variant}: 작은 눈`);
    assert.ok(Math.abs(eyes[0].x - eyes[1].x) >= 0.12, `variant ${variant}: 눈이 겹치지 않음`);
    assert.ok(eyes.every((eye) => eye.x >= 0.36 && eye.x <= 0.64 && eye.y >= 0.25 && eye.y <= 0.37), `variant ${variant}: 눈이 얼굴 안에 위치`);

    const faceEllipses = marks.filter((mark) => mark.step === 3 && mark.kind === "ellipse");
    assert.equal(faceEllipses.length, 3, `variant ${variant}: 눈 두 개와 코만 타원`);
    assert.ok(faceEllipses.every((mark) => mark.rx < 0.04 && mark.ry < 0.04), `variant ${variant}: 큰 주둥이 원 금지`);

    const earMarks = marks.filter((mark) => mark.step === 2 && mark.kind === "curve");
    assert.equal(earMarks.length, 6, `variant ${variant}: 양쪽 귀 윤곽`);
    const earPoints = earMarks.flatMap((mark) => mark.points);
    assert.ok(earPoints.every(([x]) => x <= 0.45 || x >= 0.55), `variant ${variant}: 귀가 얼굴 중앙을 침범하지 않음`);
  }
});

test("새 그림은 같은 활동의 가이드를 순환하고 교사는 자기 반 완성 그림책만 열고 피드백 요청한다", async (context) => {
  const server = await startTestServer();
  context.after(() => server.dispose());
  // 첫 요청이 실제 런타임 프로비저닝을 수행한다.
  await server.fetch("/api/student");

  const teacherId = token("teacher");
  const otherTeacherId = token("teacher");
  const classroomId = token("class");
  const otherClassroomId = token("class");
  const studentId = token("student");
  const otherStudentId = token("student");
  const teacherSession = token("session");
  const studentSession = token("session");
  const now = new Date();
  const expires = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString();
  await server.DB.batch([
    server.DB.prepare("INSERT INTO teachers(id, email, display_name) VALUES (?, 'books@example.com', '책 선생님')").bind(teacherId),
    server.DB.prepare("INSERT INTO teachers(id, email, display_name) VALUES (?, 'other-books@example.com', '다른 선생님')").bind(otherTeacherId),
    server.DB.prepare("INSERT INTO classrooms(id, teacher_id, display_name, class_code, join_token) VALUES (?, ?, '책 만드는 반', '7711', 'join_books_7711')").bind(classroomId, teacherId),
    server.DB.prepare("INSERT INTO classrooms(id, teacher_id, display_name, class_code, join_token) VALUES (?, ?, '다른 반', '7712', 'join_books_7712')").bind(otherClassroomId, otherTeacherId),
    server.DB.prepare("INSERT INTO student_profiles(id, classroom_id, nickname, animal, last_activity_at) VALUES (?, ?, '반짝 화가', '🐰', ?)").bind(studentId, classroomId, now.toISOString()),
    server.DB.prepare("INSERT INTO student_profiles(id, classroom_id, nickname, animal, last_activity_at) VALUES (?, ?, '다른 화가', '🦊', ?)").bind(otherStudentId, otherClassroomId, now.toISOString()),
    server.DB.prepare("INSERT INTO teacher_sessions(token_hash, teacher_id, expires_at, last_used_at) VALUES (?, ?, ?, ?)").bind(await sha256(teacherSession), teacherId, expires, now.toISOString()),
    server.DB.prepare("INSERT INTO device_sessions(token_hash, student_id, expires_at, last_used_at) VALUES (?, ?, ?, ?)").bind(await sha256(studentSession), studentId, expires, now.toISOString()),
  ]);

  const studentHeaders = { authorization: `Bearer ${studentSession}`, "content-type": "application/json" };
  const seenVariants = [];
  for (let index = 0; index < GUIDED_LESSON_VARIANT_COUNT; index += 1) {
    const response = await server.fetch("/api/artworks", {
      method: "POST",
      headers: studentHeaders,
      body: JSON.stringify({ learningMode: "guided", lessonSlug: "friendly-dog", clientArtworkId: `artwork_variant_${index}_123456789012` }),
    });
    seenVariants.push((await (await expectStatus(response, 201)).json()).artwork.guideVariant);
  }
  assert.deepEqual(seenVariants, [0, 1, 2, 3]);

  const completedId = "storybook_completed_12345678";
  const draftId = "storybook_draft_123456789012";
  const otherId = "storybook_other_123456789012";
  const document = JSON.stringify(emptyStorybookDocument("landscape", "page_completed123", "element_completed123"));
  await server.DB.batch([
    server.DB.prepare("INSERT INTO storybooks(id, student_id, classroom_id, title, document_json, status, completed_at) VALUES (?, ?, ?, '나의 첫 그림책', ?, 'complete', ?)").bind(completedId, studentId, classroomId, document, now.toISOString()),
    server.DB.prepare("INSERT INTO storybooks(id, student_id, classroom_id, title, document_json, status) VALUES (?, ?, ?, '작성 중인 책', ?, 'draft')").bind(draftId, studentId, classroomId, document),
    server.DB.prepare("INSERT INTO storybooks(id, student_id, classroom_id, title, document_json, status, completed_at) VALUES (?, ?, ?, '다른 반 책', ?, 'complete', ?)").bind(otherId, otherStudentId, otherClassroomId, document, now.toISOString()),
  ]);

  const teacherHeaders = { cookie: `wiggle_teacher=${teacherSession}`, "content-type": "application/json" };
  const listResponse = await server.fetch(`/api/teacher/storybooks?classroomId=${classroomId}`, { headers: teacherHeaders });
  const list = await (await expectStatus(listResponse, 200)).json();
  assert.equal(list.storybooks.length, 1);
  assert.deepEqual({ id: list.storybooks[0].id, nickname: list.storybooks[0].nickname, animal: list.storybooks[0].animal }, { id: completedId, nickname: "반짝 화가", animal: "🐰" });
  assert.equal(JSON.stringify(list).includes("documentJson"), false);
  assert.equal(JSON.stringify(list).includes("objectKey"), false);

  const bookResponse = await server.fetch(`/api/teacher/storybooks/${completedId}`, { headers: teacherHeaders });
  assert.equal((await (await expectStatus(bookResponse, 200)).json()).storybook.document.pages.length, 1);
  const crossClassRead = await server.fetch(`/api/teacher/storybooks/${otherId}`, { headers: teacherHeaders });
  assert.equal(crossClassRead.status, 404);

  const mixedRequest = await server.fetch("/api/teacher/storybooks", {
    method: "POST", headers: teacherHeaders, body: JSON.stringify({ classroomId, storybookIds: [completedId, otherId] }),
  });
  assert.equal(mixedRequest.status, 403);
  assert.equal((await server.DB.prepare("SELECT COUNT(*) AS count FROM storybook_feedback_requests").first()).count, 0);

  const feedbackRequest = await server.fetch("/api/teacher/storybooks", {
    method: "POST", headers: teacherHeaders, body: JSON.stringify({ classroomId, storybookIds: [completedId] }),
  });
  assert.deepEqual(await (await expectStatus(feedbackRequest, 202)).json(), { ok: true, requested: 1, status: "waiting_rubric" });
  const stored = await server.DB.prepare("SELECT storybook_id AS storybookId, classroom_id AS classroomId, teacher_id AS teacherId, status, rubric_version AS rubricVersion, feedback_json AS feedbackJson FROM storybook_feedback_requests").first();
  assert.deepEqual(stored, { storybookId: completedId, classroomId, teacherId, status: "waiting_rubric", rubricVersion: null, feedbackJson: null });
});
