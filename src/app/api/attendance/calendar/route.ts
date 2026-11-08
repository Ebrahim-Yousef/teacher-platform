import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN", "STUDENT"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from")?.trim() || "";
    const to = searchParams.get("to")?.trim() || "";

    const where: Record<string, unknown> = {
      ...((role === "TEACHER" || role === "ASSISTANT") && teacherId ? { teacherId } : {}),
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
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

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
    }));

    return jsonSuccess(events);
  } catch (error) {
    console.error("Attendance Calendar Error:", error);
    return jsonError("فشل في جلب تقويم الحضور", "SERVER_ERROR", 500);
  }
}
