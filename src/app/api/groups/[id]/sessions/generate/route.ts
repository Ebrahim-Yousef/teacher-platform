import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: groupId } = await context.params;
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId, userId } = authResult.auth;

    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
      include: {
        scheduleSlots: true,
      },
    });

    if (!group) {
      return jsonError("المجموعة غير موجودة", "NOT_FOUND", 404);
    }

    if (group.scheduleSlots.length === 0) {
      return jsonError("يجب ضبط المواعيد الأسبوعية للمجموعة أولاً قبل توليد الحصص", "BAD_REQUEST", 400);
    }

    const body = await request.json();
    const { from, to, title = "حصة دراسية", subjectBranchId, notes } = body;

    if (!from || !to) {
      return jsonError("تاريخ البداية والنهاية مطلوبان", "BAD_REQUEST", 400);
    }

    const startDate = new Date(from);
    const endDate = new Date(to);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
      return jsonError("نطاق التواريخ غير صالح", "BAD_REQUEST", 400);
    }

    const effectiveTeacherId = teacherId || userId;
    const createdSessions = [];
    let skipped = 0;

    const curr = new Date(startDate);
    while (curr <= endDate) {
      const dayOfWeek = curr.getDay(); // 0 is Sunday ... 6 is Saturday
      const matchingSlots = group.scheduleSlots.filter((slot) => slot.dayOfWeek === dayOfWeek);

      const dateStr = curr.toISOString().split("T")[0];

      for (const slot of matchingSlots) {
        // Check if session already exists for this group on this date and time
        const exists = await prisma.attendanceSession.findFirst({
          where: {
            groupId,
            date: dateStr,
            startTime: slot.startTime,
          },
        });

        if (exists) {
          skipped++;
        } else {
          const session = await prisma.attendanceSession.create({
            data: {
              groupId,
              teacherId: effectiveTeacherId,
              subjectBranchId: subjectBranchId || null,
              title,
              date: dateStr,
              startTime: slot.startTime,
              endTime: slot.endTime,
              notes: notes || null,
            },
          });
          createdSessions.push(session);
        }
      }

      curr.setDate(curr.getDate() + 1);
    }

    return jsonSuccess({
      created: createdSessions.length,
      sessions: createdSessions,
      skipped,
    });
  } catch (error) {
    console.error("Generate Sessions Error:", error);
    return jsonError("فشل في توليد الحصص", "SERVER_ERROR", 500);
  }
}
