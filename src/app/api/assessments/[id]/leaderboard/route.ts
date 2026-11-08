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
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN", "STUDENT"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;

    const submissions = await prisma.assessmentSubmission.findMany({
      where: { assessmentId },
      include: {
        student: { select: { id: true, name: true } },
      },
      orderBy: { totalScore: "desc" },
      take: 50,
    });

    const leaderboard = submissions.map((s, index) => ({
      rank: index + 1,
      studentId: s.student.id,
      studentName: s.student.name,
      name: s.student.name,
      score: s.totalScore,
      totalScore: s.totalScore,
      submittedAt: s.submittedAt.toISOString(),
    }));

    return jsonSuccess(leaderboard);
  } catch (error) {
    console.error("Get Leaderboard Error:", error);
    return jsonError("فشل في جلب لوحة الشرف", "SERVER_ERROR", 500);
  }
}
