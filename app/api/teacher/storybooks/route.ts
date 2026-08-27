import { bindings } from "@/db/runtime";
import { validateStorybookDocument, type StorybookDocument } from "@/lib/storybook-model";
import { cleanText, id, jsonError, noStoreJson, rateLimit, requireTeacher, sameOrigin } from "@/lib/security";

type BookRow = {
  id: string;
  title: string;
  studentId: string;
  nickname: string;
  animal: string;
  documentJson: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
  feedbackStatus: string | null;
  feedbackRequestedAt: string | null;
};

function readDocument(value: string) {
  try { return validateStorybookDocument(JSON.parse(value)); } catch { return null; }
}

function coverSummary(document: StorybookDocument) {
  const page = document.pages[0];
  const coverImage = page.elements.find((element) => element.type === "image");
  const coverText = page.elements.find((element) => element.type === "text");
  return {
    format: document.format,
    pageCount: document.pages.length,
    cover: {
      background: page.background,
      backgroundAssetId: page.backgroundAssetId ?? null,
      imageAssetId: coverImage?.assetId ?? null,
      text: coverText?.text ?? "",
    },
  };
}

async function ownedClassroom(teacherId: string, classroomId: string) {
  return bindings().DB.prepare(`SELECT id, display_name AS displayName FROM classrooms WHERE id = ? AND teacher_id = ? AND active = 1`).bind(classroomId, teacherId).first<{ id: string; displayName: string }>();
}

export async function GET(request: Request) {
  const teacher = await requireTeacher();
  if (!teacher) return jsonError("교사 로그인이 필요해요.", 401);
  const classroomId = cleanText(new URL(request.url).searchParams.get("classroomId"), 40);
  const classroom = await ownedClassroom(teacher.id, classroomId);
  if (!classroom) return jsonError("이 학급의 그림책을 볼 권한이 없어요.", 403);

  const rows = await bindings().DB.prepare(`SELECT b.id, b.title, b.student_id AS studentId, s.nickname, s.animal, b.document_json AS documentJson, b.completed_at AS completedAt, b.created_at AS createdAt, b.updated_at AS updatedAt, f.status AS feedbackStatus, f.requested_at AS feedbackRequestedAt FROM storybooks b JOIN student_profiles s ON s.id = b.student_id LEFT JOIN storybook_feedback_requests f ON f.storybook_id = b.id AND f.teacher_id = ? WHERE b.classroom_id = ? AND b.status = 'complete' AND b.completed_at IS NOT NULL ORDER BY b.completed_at DESC, b.id DESC LIMIT 200`).bind(teacher.id, classroomId).all<BookRow>();
  const storybooks = rows.results.flatMap(({ documentJson, ...book }) => {
    const document = readDocument(documentJson);
    return document ? [{ ...book, ...coverSummary(document) }] : [];
  });
  return noStoreJson({ classroom, storybooks });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("요청 출처를 확인할 수 없어요.", 403);
  const teacher = await requireTeacher();
  if (!teacher) return jsonError("교사 로그인이 필요해요.", 401);
  if (!(await rateLimit(`storybook-feedback-request:${teacher.id}`, 60, 60))) return jsonError("피드백 요청이 너무 빨라요. 잠깐 기다려 주세요.", 429);
  const payload = await request.json().catch(() => ({})) as Record<string, unknown>;
  const classroomId = cleanText(payload.classroomId, 40);
  const classroom = await ownedClassroom(teacher.id, classroomId);
  if (!classroom) return jsonError("이 학급의 그림책에 요청할 권한이 없어요.", 403);
  const requestedIds = Array.isArray(payload.storybookIds)
    ? [...new Set(payload.storybookIds.map((value) => cleanText(value, 80)).filter((value) => /^storybook_[a-zA-Z0-9_-]{8,64}$/.test(value)))].slice(0, 50)
    : [];
  if (!requestedIds.length) return jsonError("피드백을 요청할 그림책을 골라 주세요.");

  const placeholders = requestedIds.map(() => "?").join(",");
  const owned = await bindings().DB.prepare(`SELECT b.id FROM storybooks b JOIN classrooms c ON c.id = b.classroom_id WHERE b.id IN (${placeholders}) AND b.classroom_id = ? AND b.status = 'complete' AND b.completed_at IS NOT NULL AND c.teacher_id = ? AND c.active = 1`).bind(...requestedIds, classroomId, teacher.id).all<{ id: string }>();
  if (owned.results.length !== requestedIds.length) return jsonError("선택한 그림책 중 이 학급의 완성본이 아닌 책이 있어요.", 403);

  const db = bindings().DB;
  await db.batch(requestedIds.map((storybookId) => db.prepare(`INSERT INTO storybook_feedback_requests(id, storybook_id, classroom_id, teacher_id, status, requested_at, updated_at) VALUES (?, ?, ?, ?, 'waiting_rubric', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT(storybook_id, teacher_id) DO UPDATE SET status = CASE WHEN storybook_feedback_requests.status = 'complete' THEN 'complete' ELSE 'waiting_rubric' END, requested_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`).bind(id("bookfeedback"), storybookId, classroomId, teacher.id)));
  return noStoreJson({ ok: true, requested: requestedIds.length, status: "waiting_rubric" }, { status: 202 });
}
