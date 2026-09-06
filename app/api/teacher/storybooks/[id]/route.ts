import { bindings } from "@/db/runtime";
import { validateStorybookDocument } from "@/lib/storybook-model";
import { cleanText, jsonError, noStoreJson, requireTeacher } from "@/lib/security";

type TeacherBook = {
  id: string;
  classroomId: string;
  studentId: string;
  title: string;
  documentJson: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
  nickname: string;
  animal: string;
  classroomName: string;
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const teacher = await requireTeacher();
  if (!teacher) return jsonError("교사 로그인이 필요해요.", 401);
  const storybookId = cleanText((await context.params).id, 80);
  const book = await bindings().DB.prepare(`SELECT b.id, b.classroom_id AS classroomId, b.student_id AS studentId, b.title, b.document_json AS documentJson, b.completed_at AS completedAt, b.created_at AS createdAt, b.updated_at AS updatedAt, s.nickname, s.animal, c.display_name AS classroomName FROM storybooks b JOIN student_profiles s ON s.id = b.student_id JOIN classrooms c ON c.id = b.classroom_id WHERE b.id = ? AND b.status = 'complete' AND b.completed_at IS NOT NULL AND c.teacher_id = ? AND c.active = 1`).bind(storybookId, teacher.id).first<TeacherBook>();
  if (!book) return jsonError("이 학급의 완성 그림책을 찾을 수 없어요.", 404);
  let document;
  try { document = validateStorybookDocument(JSON.parse(book.documentJson)); } catch { document = null; }
  if (!document) return jsonError("저장된 그림책을 안전하게 펼칠 수 없어요.", 422);
  const assets = await bindings().DB.prepare(`SELECT id, source_type AS sourceType, source_artwork_id AS sourceArtworkId, content_type AS contentType, byte_size AS byteSize, created_at AS createdAt FROM storybook_assets WHERE storybook_id = ? AND student_id = ? ORDER BY created_at, id`).bind(book.id, book.studentId).all();
  const { documentJson: _documentJson, ...summary } = book;
  void _documentJson;
  return noStoreJson({ storybook: { ...summary, document }, assets: assets.results });
}
