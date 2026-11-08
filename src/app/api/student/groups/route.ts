import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

export async function GET() {
  try {
    const authResult = await requireAuth(["STUDENT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { userId } = authResult.auth;

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!student) {
      return jsonSuccess([]);
    }

    const memberships = await prisma.groupMember.findMany({
      where: { studentId: student.id },
      include: {
        group: {
          include: {
            teacher: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
          },
        },
      },
    });

    const formatted = memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      title: m.group.name,
      teacher: m.group.teacher,
      teacherName: m.group.teacher?.name,
      subject: m.group.subject,
      subjectName: m.group.subject?.name,
    }));

    return jsonSuccess(formatted);
  } catch (error) {
    console.error("Student Groups Error:", error);
    return jsonError("فشل في جلب مجموعات الطالب", "SERVER_ERROR", 500);
  }
}
