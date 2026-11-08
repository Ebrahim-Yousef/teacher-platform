import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

export async function GET() {
  try {
    const authResult = await requireAuth(["STUDENT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { userId } = authResult.auth;

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        teacher: { select: { id: true, name: true } },
        groupMemberships: {
          include: {
            group: {
              include: {
                teacher: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!studentProfile) {
      return jsonError("ملف الطالب غير موجود", "NOT_FOUND", 404);
    }

    const teacherMap = new Map<string, { id: string; name: string }>();
    if (studentProfile.teacher) {
      teacherMap.set(studentProfile.teacher.id, studentProfile.teacher);
    }
    for (const gm of studentProfile.groupMemberships) {
      if (gm.group.teacher) {
        teacherMap.set(gm.group.teacher.id, gm.group.teacher);
      }
    }

    const teachers = Array.from(teacherMap.values());

    return jsonSuccess({
      student: {
        id: studentProfile.id,
        name: studentProfile.name,
        fullName: studentProfile.name,
        studentPhone: studentProfile.studentPhone,
        phone: studentProfile.studentPhone,
        parentPhone: studentProfile.parentPhone,
        stage: studentProfile.stage,
        grade: studentProfile.grade,
      },
      profile: {
        id: studentProfile.id,
        name: studentProfile.name,
        studentPhone: studentProfile.studentPhone,
        parentPhone: studentProfile.parentPhone,
        stage: studentProfile.stage,
        grade: studentProfile.grade,
      },
      teachers,
      enrollments: teachers.map((t) => ({ id: t.id, teacher: t })),
    });
  } catch (error) {
    console.error("Student Me Error:", error);
    return jsonError("فشل في جلب بيانات الطالب", "SERVER_ERROR", 500);
  }
}
