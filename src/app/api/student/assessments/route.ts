import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

export async function GET() {
  try {
    const authResult = await requireAuth(["STUDENT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { userId } = authResult.auth;

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!student) {
      return jsonSuccess([]);
    }

    // Find all groups student is a member of
    const memberships = await prisma.groupMember.findMany({
      where: { studentId: student.id },
      select: { groupId: true },
    });

    const groupIds = memberships.map((m) => m.groupId);

    const assessments = await prisma.assessment.findMany({
      where: {
        groupId: { in: groupIds },
      },
      include: {
        teacher: { select: { id: true, name: true } },
        group: { select: { name: true } },
        submissions: {
          where: { studentId: student.id },
        },
        scores: {
          where: { studentId: student.id },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    const now = new Date();

    const formatted = assessments.map((a) => {
      const submission = a.submissions[0];
      const manualScore = a.scores[0];

      let status = "available";
      if (a.deliveryMode === "ONLINE") {
        if (!a.isPublished) {
          status = "upcoming";
        } else if (a.availableFrom && new Date(a.availableFrom) > now) {
          status = "upcoming";
        } else if (a.availableTo && new Date(a.availableTo) < now) {
          status = submission ? "closed" : "closed";
        } else if (submission) {
          status = "submitted";
        } else {
          status = "available";
        }
      } else {
        status = manualScore ? "submitted" : "upcoming";
      }

      const score = submission ? submission.totalScore : manualScore ? manualScore.score : null;

      return {
        id: a.id,
        assessmentId: a.id,
        title: a.title,
        name: a.title,
        kind: a.deliveryMode.toLowerCase(),
        deliveryMode: a.deliveryMode,
        status,
        date: a.date,
        availableFrom: a.availableFrom,
        availableTo: a.availableTo,
        score,
        totalScore: score,
        maxScore: a.maxScore,
        teacher: a.teacher,
        teacherName: a.teacher?.name,
      };
    });

    return jsonSuccess(formatted);
  } catch (error) {
    console.error("Student Assessments Error:", error);
    return jsonError("فشل في جلب تقييمات الطالب", "SERVER_ERROR", 500);
  }
}
