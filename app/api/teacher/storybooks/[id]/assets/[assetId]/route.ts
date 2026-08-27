import { bindings } from "@/db/runtime";
import { cleanText, jsonError, requireTeacher } from "@/lib/security";

type TeacherAsset = { objectKey: string; contentType: string };

export async function GET(_request: Request, context: { params: Promise<{ id: string; assetId: string }> }) {
  const teacher = await requireTeacher();
  if (!teacher) return jsonError("교사 로그인이 필요해요.", 401);
  const params = await context.params;
  const storybookId = cleanText(params.id, 80);
  const assetId = cleanText(params.assetId, 80);
  const asset = await bindings().DB.prepare(`SELECT a.object_key AS objectKey, a.content_type AS contentType FROM storybook_assets a JOIN storybooks b ON b.id = a.storybook_id JOIN classrooms c ON c.id = b.classroom_id WHERE a.id = ? AND a.storybook_id = ? AND b.status = 'complete' AND c.teacher_id = ? AND c.active = 1`).bind(assetId, storybookId, teacher.id).first<TeacherAsset>();
  if (!asset) return jsonError("이 그림책 이미지를 볼 권한이 없어요.", 404);
  const object = await bindings().ARTWORKS.get(asset.objectKey);
  if (!object) return jsonError("저장된 이미지 파일을 찾을 수 없어요.", 404);
  return new Response(await object.arrayBuffer(), {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? asset.contentType,
      "cache-control": "private, no-store",
      "content-disposition": "inline",
      "x-content-type-options": "nosniff",
    },
  });
}
