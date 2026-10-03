import { bindings } from "@/db/runtime";
import { storybookEditorActor } from "@/lib/storybook-editor-auth";
import { ownedStorybook } from "@/lib/storybook-store";
import { noStoreJson, jsonError } from "@/lib/security";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const student = await storybookEditorActor(request);
  if (!student) return jsonError("로그인이 필요해요.", 401);
  if (!await ownedStorybook((await context.params).id, student.id)) return jsonError("그림책을 찾을 수 없어요.", 404);
  const artworks = await bindings().DB.prepare("SELECT id, title, status FROM artworks WHERE student_id = ? AND status = 'complete' AND final_image_key IS NOT NULL ORDER BY updated_at DESC").bind(student.id).all();
  return noStoreJson({ artworks: artworks.results });
}
