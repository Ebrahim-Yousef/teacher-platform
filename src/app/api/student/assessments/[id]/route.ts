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

    const assessment = await prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        isPublished: true,
      },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
        teacher: { select: { id: true, name: true } },
      },
    });

    if (!assessment) {
      return jsonError("التقييم غير متاح حالياً", "NOT_FOUND", 404);
    }

    // Check if student already submitted
    const existingSubmission = await prisma.assessmentSubmission.findUnique({
      where: {
        assessmentId_studentId: {
          assessmentId,
          studentId: student.id,
        },
      },
    });

    const sanitizedQuestions = assessment.questions.map((q) => {
      let optionsList: Array<{ id: string | number; text: string }> = [];
      try {
        if (q.options) {
          const parsed = JSON.parse(q.options);
          if (Array.isArray(parsed)) {
            optionsList = parsed.map((opt: { text?: string }, index: number) => ({
              id: index + 1,
              text: typeof opt === "string" ? opt : opt.text || "",
            }));
          }
        }
      } catch {
        optionsList = [];
      }

      return {
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        points: q.points,
        options: optionsList,
      };
    });

    return jsonSuccess({
      id: assessment.id,
      title: assessment.title,
      type: assessment.type,
      maxScore: assessment.maxScore,
      instructions: assessment.instructions,
      teacher: assessment.teacher,
      teacherName: assessment.teacher?.name,
      alreadySubmitted: Boolean(existingSubmission),
      questions: sanitizedQuestions,
    });
  } catch (error) {
    console.error("Student Assessment Detail Error:", error);
    return jsonError("فشل في جلب أسئلة الاختبار", "SERVER_ERROR", 500);
  }
}
