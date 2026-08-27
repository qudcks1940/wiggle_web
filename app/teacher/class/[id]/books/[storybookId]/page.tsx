import { redirect } from "next/navigation";
import { TeacherStorybookPreview } from "@/app/components/TeacherStorybookPreview";
import { requiresHostedTeacherAuthentication } from "@/lib/runtime/environment";
import { requireTeacher } from "@/lib/security";

export const dynamic = "force-dynamic";

export default async function TeacherStorybookPreviewPage({ params }: { params: Promise<{ id: string; storybookId: string }> }) {
  const { id, storybookId } = await params;
  const returnTo = `/teacher/class/${id}/books/${storybookId}`;
  if (requiresHostedTeacherAuthentication() && !(await requireTeacher())) redirect(`/api/auth/google/start?return_to=${encodeURIComponent(returnTo)}`);
  return <TeacherStorybookPreview classroomId={id} storybookId={storybookId} />;
}
