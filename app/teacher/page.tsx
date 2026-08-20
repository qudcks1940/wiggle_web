import { TeacherApp } from "@/app/components/TeacherApp";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/security";
import { requiresHostedTeacherAuthentication } from "@/lib/runtime/environment";

export const dynamic = "force-dynamic";

export default async function TeacherPage() {
  if (requiresHostedTeacherAuthentication() && !(await requireTeacher())) redirect("/api/auth/google/start?return_to=%2Fteacher");
  return <TeacherApp />;
}
