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
      include: { branches: true },
      orderBy: { createdAt: "asc" },
    });

    const activeSubjects = subjects.filter((s) => s.isActive);
    const activeSubjectIds = activeSubjects.map((s) => s.id);

    return jsonSuccess({
      subjects,
      activeSubjectIds,
    });
  } catch (error) {
    console.error("Get Teacher Subjects Error:", error);
    return jsonError("فشل في جلب مواد المعلم", "SERVER_ERROR", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { teacherId } = authResult.auth;

    if (!teacherId) {
      return jsonError("المعلم غير محدد", "BAD_REQUEST", 400);
    }

    const body = await request.json();
    const subjectIds = Array.isArray(body.subjectIds)
      ? (body.subjectIds as (string | number)[]).map(String)
      : [];

    await prisma.$transaction(async (tx) => {
      // Set all teacher's subjects isActive to false first
      await tx.subject.updateMany({
        where: { teacherId },
        data: { isActive: false },
      });

      // Then activate selected ones
      if (subjectIds.length > 0) {
        await tx.subject.updateMany({
          where: {
            teacherId,
            id: { in: subjectIds },
          },
          data: { isActive: true },
        });
      }
    });

    return NextResponse.json({ success: true, message: "تم تحديث المواد النشطة بنجاح" });
  } catch (error) {
    console.error("Save Teacher Subjects Error:", error);
    return jsonError("فشل في حفظ المواد", "SERVER_ERROR", 500);
  }
}
