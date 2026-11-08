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
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const assessment = await prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
      include: {
        group: {
          include: {
            members: {
              include: {
                student: true,
              },
            },
          },
        },
        submissions: {
          include: {
            student: true,
            answers: {
              include: {
                question: true,
              },
            },
          },
        },
      },
    });

    if (!assessment) {
      return jsonError("التقييم غير موجود", "NOT_FOUND", 404);
    }

    const members = assessment.group.members;
    const submissionsMap = new Map(
      assessment.submissions.map((s) => [s.studentId, s]),
    );

    const students = members.map((m) => {
      const sub = submissionsMap.get(m.studentId);
      return {
        student: { id: m.student.id, name: m.student.name },
        submissionId: sub ? sub.id : null,
        status: sub ? sub.status : "pending",
        totalScore: sub ? sub.totalScore : null,
        autoScore: sub ? sub.autoScore : null,
        submittedAt: sub ? sub.submittedAt.toISOString() : null,
        answers: sub
          ? sub.answers.map((a) => ({
              id: a.id,
              answerId: a.id,
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
            }))
          : [],
      };
    });

    const submittedStudents = students.filter((s) => s.submissionId !== null);
    const scores = submittedStudents.map((s) => s.totalScore || 0);
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;

    return jsonSuccess({
      students,
      summary: {
        totalStudents: members.length,
        submittedCount: submittedStudents.length,
        averageScore: Math.round(averageScore * 10) / 10,
        highestScore,
      },
    });
  } catch (error) {
    console.error("Get Assessment Results Error:", error);
    return jsonError("فشل في جلب نتائج التقييم", "SERVER_ERROR", 500);
  }
}
