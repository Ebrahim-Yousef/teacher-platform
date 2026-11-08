import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

type RouteContext = { params: Promise<{ studentId: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { studentId } = await context.params;
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN", "STUDENT"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const student = await prisma.studentProfile.findFirst({
      where: {
        id: studentId,
        ...((role === "TEACHER" || role === "ASSISTANT") && teacherId ? { teacherId } : {}),
      },
    });

    if (!student) {
      return jsonError("الطالب غير موجود", "NOT_FOUND", 404);
    }

    const records = await prisma.attendanceRecord.findMany({
      where: {
        studentId,
        ...((role === "TEACHER" || role === "ASSISTANT") && teacherId ? { session: { teacherId } } : {}),
      },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            date: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = records.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      status: r.status,
      note: r.note,
      title: r.session.title,
      sessionTitle: r.session.title,
      date: r.session.date,
      sessionDate: r.session.date,
      session: r.session,
    }));

    return jsonSuccess(formatted);
  } catch (error) {
    console.error("Get Student Attendance Error:", error);
    return jsonError("فشل في جلب سجل حضور الطالب", "SERVER_ERROR", 500);
  }
}
