import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

type RouteContext = { params: Promise<{ studentId: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { studentId } = await context.params;
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN", "STUDENT"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const student = await prisma.studentProfile.findFirst({
      where: {
        id: studentId,
        ...((role === "TEACHER" || role === "ASSISTANT") && teacherId ? { teacherId } : {}),
      },
    });

    if (!student) {
      return jsonError("الطالب غير موجود", "NOT_FOUND", 404);
    }

    // Manual assessment scores
    const manualScores = await prisma.assessmentScore.findMany({
      where: {
        studentId,
        ...((role === "TEACHER" || role === "ASSISTANT") && teacherId ? { assessment: { teacherId } } : {}),
      },
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            type: true,
            date: true,
            maxScore: true,
            deliveryMode: true,
          },
        },
      },
    });

    // Online submissions
    const onlineSubmissions = await prisma.assessmentSubmission.findMany({
      where: {
        studentId,
        ...((role === "TEACHER" || role === "ASSISTANT") && teacherId ? { assessment: { teacherId } } : {}),
      },
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            type: true,
            date: true,
            maxScore: true,
            deliveryMode: true,
          },
        },
      },
    });

    const items = [
      ...manualScores.map((s) => ({
        id: s.id,
        assessmentId: s.assessmentId,
        title: s.assessment.title,
        type: s.assessment.type,
        deliveryMode: s.assessment.deliveryMode,
        date: s.assessment.date,
        score: s.score,
        maxScore: s.assessment.maxScore,
        note: s.note,
      })),
      ...onlineSubmissions.map((sub) => ({
        id: sub.id,
        assessmentId: sub.assessmentId,
        title: sub.assessment.title,
        type: sub.assessment.type,
        deliveryMode: sub.assessment.deliveryMode,
        date: sub.assessment.date,
        score: sub.totalScore,
        maxScore: sub.assessment.maxScore,
        status: sub.status,
      })),
    ];

    return jsonSuccess(items);
  } catch (error) {
    console.error("Get Student Performance Error:", error);
    return jsonError("فشل في جلب تقييمات الطالب", "SERVER_ERROR", 500);
  }
}
