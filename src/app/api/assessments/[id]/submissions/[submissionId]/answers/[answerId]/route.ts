import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonError } from "@/lib/serverAuth";

type RouteContext = {
  params: Promise<{
    id: string;
    submissionId: string;
    answerId: string;
  }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { submissionId, answerId } = await context.params;
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;

    const body = await request.json();
    const pointsAwarded = Number(body.pointsAwarded) || 0;

    await prisma.$transaction(async (tx) => {
      await tx.assessmentAnswer.update({
        where: { id: answerId },
        data: {
          pointsAwarded,
          isCorrect: pointsAwarded > 0,
        },
      });

      // Recalculate totalScore for the submission
      const allAnswers = await tx.assessmentAnswer.findMany({
        where: { submissionId },
      });
      const newTotal = allAnswers.reduce(
        (sum, a) => sum + (a.pointsAwarded !== null && a.pointsAwarded !== undefined ? a.pointsAwarded : 0),
        0,
      );

      await tx.assessmentSubmission.update({
        where: { id: submissionId },
        data: {
          totalScore: newTotal,
          status: "graded",
        },
      });
    });

    return NextResponse.json({ success: true, message: "تم تصحيح الإجابة بنجاح" });
  } catch (error) {
    console.error("Grade Submission Answer Error:", error);
    return jsonError("فشل في تصحيح السؤال", "SERVER_ERROR", 500);
  }
}
