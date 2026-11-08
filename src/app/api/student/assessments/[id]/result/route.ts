import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
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

    const submission = await prisma.assessmentSubmission.findUnique({
      where: {
        assessmentId_studentId: {
          assessmentId,
          studentId: student.id,
        },
      },
      include: {
        assessment: true,
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!submission) {
      return jsonError("لم يتم العثور على نتيجة لهذا الاختبار", "NOT_FOUND", 404);
    }

    let pendingTextQuestions = 0;
    const answers = submission.answers.map((a) => {
      if (a.question.type === "SHORT_TEXT" && a.pointsAwarded === null) {
        pendingTextQuestions++;
      }

      return {
        id: a.id,
        type: a.question.type,
        booleanAnswer: a.booleanAnswer,
        selectedOptionText: a.selectedOptionId,
        textAnswer: a.textAnswer,
        pointsAwarded: a.pointsAwarded,
        score: a.pointsAwarded,
        isCorrect: a.isCorrect,
        question: {
          id: a.question.id,
          type: a.question.type,
          prompt: a.question.prompt,
          points: a.question.points,
        },
      };
    });

    const maxScore = submission.assessment.maxScore;
    const percentage = maxScore > 0 ? Math.round((submission.totalScore / maxScore) * 100) : 0;

    return jsonSuccess({
      title: submission.assessment.title,
      autoScore: submission.autoScore,
      totalScore: submission.totalScore,
      maxScore,
      percentage,
      pendingTextQuestions,
      answers,
    });
  } catch (error) {
    console.error("Student Assessment Result Error:", error);
    return jsonError("فشل في جلب نتيجة الاختبار", "SERVER_ERROR", 500);
  }
}
