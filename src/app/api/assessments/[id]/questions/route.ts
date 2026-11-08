import { NextRequest, NextResponse } from "next/server";
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
    const { role, teacherId } = authResult.auth;

    const assessment = await prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        ...((role === "TEACHER" || role === "ASSISTANT") && teacherId ? { teacherId } : {}),
      },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!assessment) {
      return jsonError("التقييم غير موجود", "NOT_FOUND", 404);
    }

    const formatted = assessment.questions.map((q) => {
      let parsedOptions = [];
      try {
        if (q.options) parsedOptions = JSON.parse(q.options);
      } catch {
        parsedOptions = [];
      }
      return {
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        points: q.points,
        options: parsedOptions,
        correctAnswer: q.correctAnswer,
        correctBoolean: q.correctAnswer === "true",
      };
    });

    return jsonSuccess(formatted);
  } catch (error) {
    console.error("Get Questions Error:", error);
    return jsonError("فشل في جلب الأسئلة", "SERVER_ERROR", 500);
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: assessmentId } = await context.params;
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
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
    const questions = Array.isArray(body.questions) ? body.questions : [];

    await prisma.$transaction(async (tx) => {
      await tx.assessmentQuestion.deleteMany({
        where: { assessmentId },
      });

      let totalMaxScore = 0;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const points = Number(q.points) || 1;
        totalMaxScore += points;

        let optionsStr: string | null = null;
        let correctAnswer: string | null = null;

        if (q.type === "TRUE_FALSE") {
          correctAnswer = q.correctBoolean ? "true" : "false";
        } else if (q.type === "MCQ") {
          const rawOptions = Array.isArray(q.options) ? q.options : [];
          optionsStr = JSON.stringify(rawOptions);
          const correctOpt = rawOptions.find((o: { isCorrect?: boolean; text?: string }) => o.isCorrect);
          correctAnswer = correctOpt?.text || null;
        }

        await tx.assessmentQuestion.create({
          data: {
            assessmentId,
            type: q.type || "MCQ",
            prompt: q.prompt || "",
            points,
            options: optionsStr,
            correctAnswer,
            order: i,
          },
        });
      }

      if (totalMaxScore > 0) {
        await tx.assessment.update({
          where: { id: assessmentId },
          data: { maxScore: totalMaxScore },
        });
      }
    });

    return NextResponse.json({ success: true, message: "تم حفظ الأسئلة بنجاح" });
  } catch (error) {
    console.error("Save Questions Error:", error);
    return jsonError("فشل في حفظ الأسئلة", "SERVER_ERROR", 500);
  }
}
