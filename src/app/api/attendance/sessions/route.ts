import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const groupId = searchParams.get("groupId")?.trim() || "";
    const date = searchParams.get("date")?.trim() || "";
    const from = searchParams.get("from")?.trim() || "";
    const to = searchParams.get("to")?.trim() || "";

    const where: Record<string, unknown> = {
      ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      ...(groupId ? { groupId } : {}),
      ...(date ? { date } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const total = await prisma.attendanceSession.count({ where });
    const totalPages = Math.ceil(total / limit) || 1;

    const sessions = await prisma.attendanceSession.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        group: { select: { id: true, name: true } },
        records: true,
      },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
    });

    return jsonSuccess(sessions, {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    console.error("List Sessions Error:", error);
    return jsonError("فشل في جلب قائمة الحصص", "SERVER_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { teacherId, userId } = authResult.auth;

    const body = await request.json();
    const { groupId, title, date, startTime, endTime, notes, subjectBranchId } = body;

    if (!groupId || !title || !date || !startTime || !endTime) {
      return jsonError("المجموعة والعنوان والتاريخ ووقت البداية والنهاية حقول مطلوبة", "BAD_REQUEST", 400);
    }

    const effectiveTeacherId = teacherId || userId;

    const session = await prisma.attendanceSession.create({
      data: {
        groupId,
        teacherId: effectiveTeacherId,
        subjectBranchId: subjectBranchId || null,
        title: title.trim(),
        date,
        startTime,
        endTime,
        notes: notes || null,
      },
      include: {
        group: true,
        records: true,
      },
    });

    return jsonSuccess(session, 201);
  } catch (error) {
    console.error("Create Session Error:", error);
    return jsonError("فشل في إنشاء الحصة", "SERVER_ERROR", 500);
  }
}
