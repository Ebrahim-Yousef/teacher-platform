import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonError } from "@/lib/serverAuth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: assessmentId } = await context.params;
    const authResult = await requireAuth(["STUDENT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { userId } = authResult.auth;

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!student) {
      return jsonError("ملف الطالب غير موجود", "NOT_FOUND", 404);
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: true,
      },
    });

    if (!assessment) {
      return jsonError("التقييم غير موجود", "NOT_FOUND", 404);
    }

    const existingSubmission = await prisma.assessmentSubmission.findUnique({
      where: {
        assessmentId_studentId: {
          assessmentId,
          studentId: student.id,
        },
      },
    });

    if (existingSubmission) {
      return jsonError("لقد قمت بتسليم هذا الاختبار مسبقاً", "BAD_REQUEST", 400);
    }

    const body = await request.json();
    const answers = Array.isArray(body.answers) ? body.answers : [];

    const questionMap = new Map(assessment.questions.map((q) => [q.id, q]));

    let autoScore = 0;
    let hasShortText = false;

    await prisma.$transaction(async (tx) => {
      const submission = await tx.assessmentSubmission.create({
        data: {
          assessmentId,
          studentId: student.id,
          autoScore: 0,
          totalScore: 0,
          status: "submitted",
        },
      });

      for (const ans of answers) {
        const questionId = String(ans.questionId);
        const q = questionMap.get(questionId);
        if (!q) continue;

        let pointsAwarded: number | null = null;
        let isCorrect: boolean | null = null;

        if (q.type === "TRUE_FALSE") {
          const expected = q.correctAnswer === "true";
          const actual = ans.booleanAnswer === true;
          isCorrect = actual === expected;
          pointsAwarded = isCorrect ? q.points : 0;
          autoScore += pointsAwarded;
        } else if (q.type === "MCQ") {
          const selectedText = String(ans.selectedOptionId || ans.text || "").trim();
          isCorrect = q.correctAnswer !== null && selectedText.toLowerCase() === q.correctAnswer.toLowerCase();
          pointsAwarded = isCorrect ? q.points : 0;
          autoScore += pointsAwarded;
        } else if (q.type === "SHORT_TEXT") {
          hasShortText = true;
          pointsAwarded = null;
          isCorrect = null;
        }

        await tx.assessmentAnswer.create({
          data: {
            submissionId: submission.id,
            questionId,
            booleanAnswer: typeof ans.booleanAnswer === "boolean" ? ans.booleanAnswer : null,
            selectedOptionId: ans.selectedOptionId ? String(ans.selectedOptionId) : null,
            textAnswer: ans.textAnswer ? String(ans.textAnswer) : null,
            pointsAwarded,
            isCorrect,
          },
        });
      }

      await tx.assessmentSubmission.update({
        where: { id: submission.id },
        data: {
          autoScore,
          totalScore: autoScore,
          status: hasShortText ? "submitted" : "graded",
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "تم تسليم الاختبار بنجاح",
      autoScore,
    });
  } catch (error) {
    console.error("Submit Assessment Error:", error);
    return jsonError("فشل في تسليم الاختبار", "SERVER_ERROR", 500);
  }
}
