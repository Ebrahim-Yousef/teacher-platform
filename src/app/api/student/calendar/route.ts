import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(["STUDENT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { userId } = authResult.auth;

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!student) {
      return jsonSuccess({ events: [], conflicts: [], hasConflict: false });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from")?.trim() || "";
    const to = searchParams.get("to")?.trim() || "";

    const memberships = await prisma.groupMember.findMany({
      where: { studentId: student.id },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);

    const where: Record<string, unknown> = {
      groupId: { in: groupIds },
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const sessions = await prisma.attendanceSession.findMany({
      where,
      include: {
        group: { select: { name: true } },
        teacher: { select: { name: true } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    // Detect time conflicts across enrolled groups
    const conflicts: Array<{ message: string; date: string; from: string }> = [];
    const dateMap = new Map<string, typeof sessions>();

    for (const s of sessions) {
      const list = dateMap.get(s.date) || [];
      for (const other of list) {
        // Overlap if (s.startTime < other.endTime && s.endTime > other.startTime)
        if (s.startTime < other.endTime && s.endTime > other.startTime) {
          conflicts.push({
            message: `تعارض بين حصة (${s.title} - ${s.group.name}) وحصة (${other.title} - ${other.group.name})`,
            date: s.date,
            from: s.startTime,
          });
        }
      }
      list.push(s);
      dateMap.set(s.date, list);
    }

    const events = sessions.map((s) => ({
      id: s.id,
      title: s.title,
      name: s.title,
      type: "session",
      date: s.date,
      startDate: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      group: s.group,
      groupName: s.group?.name,
      teacher: s.teacher,
      teacherName: s.teacher?.name,
      hasConflict: conflicts.some((c) => c.date === s.date),
    }));

    return jsonSuccess({
      events,
      conflicts,
      hasConflict: conflicts.length > 0,
    });
  } catch (error) {
    console.error("Student Calendar Error:", error);
    return jsonError("فشل في جلب التقويم الدراسي", "SERVER_ERROR", 500);
  }
}
