import { bindings } from "@/db/runtime";
import { storybookEditorActor } from "@/lib/storybook-editor-auth";
import { jsonError } from "@/lib/security";

export async function GET(request: Request, context: { params: Promise<{ artworkId: string }> }) {
  const student = await storybookEditorActor(request);
  if (!student) return jsonError("로그인이 필요해요.", 401);
  const artwork = await bindings().DB.prepare("SELECT final_image_key AS imageKey FROM artworks WHERE id = ? AND student_id = ? AND status = 'complete'").bind((await context.params).artworkId, student.id).first<{ imageKey: string | null }>();
  const object = artwork?.imageKey ? await bindings().ARTWORKS.get(artwork.imageKey) : null;
  if (!object) return jsonError("그림을 찾을 수 없어요.", 404);
  return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType ?? "image/png", "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}
