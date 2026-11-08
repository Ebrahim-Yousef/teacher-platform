import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN", "STUDENT"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const assessment = await prisma.assessment.findFirst({
      where: {
        id,
        ...((role === "TEACHER" || role === "ASSISTANT") && teacherId ? { teacherId } : {}),
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
        scores: {
          include: {
            student: true,
          },
        },
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!assessment) {
      return jsonError("التقييم غير موجود", "NOT_FOUND", 404);
    }

    return jsonSuccess(assessment);
  } catch (error) {
    console.error("Get Assessment Error:", error);
    return jsonError("فشل في جلب بيانات التقييم", "SERVER_ERROR", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const existing = await prisma.assessment.findFirst({
      where: {
        id,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
    });

    if (!existing) {
      return jsonError("التقييم غير موجود", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const {
      title,
      type,
      deliveryMode,
      date,
      maxScore,
      notes,
      instructions,
      availableFrom,
      availableTo,
      isPublished,
    } = body;

    const updated = await prisma.assessment.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(deliveryMode !== undefined ? { deliveryMode } : {}),
        ...(date !== undefined ? { date } : {}),
        ...(maxScore !== undefined ? { maxScore: Number(maxScore) } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(instructions !== undefined ? { instructions } : {}),
        ...(availableFrom !== undefined ? { availableFrom } : {}),
        ...(availableTo !== undefined ? { availableTo } : {}),
        ...(isPublished !== undefined ? { isPublished: Boolean(isPublished) } : {}),
      },
      include: {
        group: true,
        scores: true,
      },
    });

    return jsonSuccess(updated);
  } catch (error) {
    console.error("Update Assessment Error:", error);
    return jsonError("فشل في تحديث التقييم", "SERVER_ERROR", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const existing = await prisma.assessment.findFirst({
      where: {
        id,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
    });

    if (!existing) {
      return jsonError("التقييم غير موجود", "NOT_FOUND", 404);
    }

    await prisma.assessment.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "تم حذف التقييم بنجاح" });
  } catch (error) {
    console.error("Delete Assessment Error:", error);
    return jsonError("فشل في حذف التقييم", "SERVER_ERROR", 500);
  }
}
