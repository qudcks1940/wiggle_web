import { TeacherApp } from "@/app/components/TeacherApp";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/security";
import { requiresHostedTeacherAuthentication } from "@/lib/runtime/environment";

export const dynamic = "force-dynamic";

export default async function TeacherClassPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  if (requiresHostedTeacherAuthentication() && !(await requireTeacher())) redirect(`/api/auth/google/start?return_to=${encodeURIComponent(`/teacher/class/${id}`)}`);
  return <TeacherApp classroomId={id} />;
}
