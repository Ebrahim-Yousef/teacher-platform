import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonError } from "@/lib/serverAuth";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: assessmentId } = await context.params;
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const assessment = await prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
    });

    if (!assessment) {
      return jsonError("التقييم غير موجود", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const scores = Array.isArray(body.scores) ? body.scores : [];

    await prisma.$transaction(async (tx) => {
      for (const item of scores) {
        const studentId = String(item.studentId);
        const score = Number(item.score);
        const note = item.note ? String(item.note) : null;

        await tx.assessmentScore.upsert({
          where: {
            assessmentId_studentId: {
              assessmentId,
              studentId,
            },
          },
          update: {
            score,
            note,
          },
          create: {
            assessmentId,
            studentId,
            score,
            note,
          },
        });
      }
    });

    return NextResponse.json({ success: true, message: "تم حفظ الدرجات بنجاح" });
  } catch (error) {
    console.error("Upsert Scores Error:", error);
    return jsonError("فشل في حفظ درجات التقييم", "SERVER_ERROR", 500);
  }
}
