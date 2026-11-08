import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

export async function GET() {
  try {
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { teacherId } = authResult.auth;

    if (!teacherId) {
      return jsonSuccess({ subjects: [], activeSubjectIds: [] });
    }

    const subjects = await prisma.subject.findMany({
      where: { teacherId },
      orderBy: { createdAt: "asc" },
    });

    const activeSubjectIds = subjects.filter((s) => s.isActive).map((s) => s.id);

    return jsonSuccess({
      subjects,
      activeSubjectIds,
    });
  } catch (error) {
    console.error("Get Active Subjects Error:", error);
    return jsonError("فشل في جلب المواد النشطة", "SERVER_ERROR", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { teacherId, userId } = authResult.auth;

    const effectiveTeacherId = teacherId || userId;
    const body = await request.json();
    const subjectIds = Array.isArray(body.subjectIds)
      ? (body.subjectIds as (string | number)[]).map(String)
      : [];

    await prisma.$transaction(async (tx) => {
      await tx.subject.updateMany({
        where: { teacherId: effectiveTeacherId },
        data: { isActive: false },
      });

      if (subjectIds.length > 0) {
        await tx.subject.updateMany({
          where: {
            teacherId: effectiveTeacherId,
            id: { in: subjectIds },
          },
          data: { isActive: true },
        });
      }
    });

    return NextResponse.json({ success: true, message: "تم تحديث المواد النشطة بنجاح" });
  } catch (error) {
    console.error("Save Active Subjects Error:", error);
    return jsonError("فشل في حفظ المواد النشطة", "SERVER_ERROR", 500);
  }
}
