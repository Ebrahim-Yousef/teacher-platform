export const dynamic = "force-dynamic";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // التوجيه الذكي حسب رتبة المستخدم
  switch (session.role) {
    case "SUPER_ADMIN":
      redirect("/admin");
    case "TEACHER":
    case "ASSISTANT":
      redirect("/teacher");
    case "STUDENT":
      redirect("/student");
    default:
      redirect("/login");
  }
}
