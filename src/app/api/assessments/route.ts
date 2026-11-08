import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN", "STUDENT"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const groupId = searchParams.get("groupId")?.trim() || "";
    const type = searchParams.get("type")?.trim() || "";
    const deliveryMode = searchParams.get("deliveryMode")?.trim() || "";

    const where: Record<string, unknown> = {
      ...((role === "TEACHER" || role === "ASSISTANT") && teacherId ? { teacherId } : {}),
      ...(groupId ? { groupId } : {}),
      ...(type ? { type } : {}),
      ...(deliveryMode ? { deliveryMode } : {}),
    };

    const total = await prisma.assessment.count({ where });
    const totalPages = Math.ceil(total / limit) || 1;

    const assessments = await prisma.assessment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        group: { select: { id: true, name: true } },
        scores: true,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return jsonSuccess(assessments, {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    console.error("List Assessments Error:", error);
    return jsonError("فشل في جلب قائمة التقييمات", "SERVER_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { teacherId, userId } = authResult.auth;

    const body = await request.json();
    const {
      groupId,
      title,
      type = "QUIZ",
      deliveryMode = "MANUAL",
      date,
      maxScore = 100,
      notes,
      instructions,
      availableFrom,
      availableTo,
    } = body;

    if (!groupId || !title || !date) {
      return jsonError("المجموعة والعنوان والتاريخ حقول مطلوبة", "BAD_REQUEST", 400);
    }

    const effectiveTeacherId = teacherId || userId;

    const assessment = await prisma.assessment.create({
      data: {
        groupId,
        teacherId: effectiveTeacherId,
        title: title.trim(),
        type,
        deliveryMode,
        date,
        maxScore: Number(maxScore) || 100,
        notes: notes || null,
        instructions: instructions || null,
        availableFrom: availableFrom || null,
        availableTo: availableTo || null,
        isPublished: false,
      },
      include: {
        group: true,
      },
    });

    return jsonSuccess(assessment, 201);
  } catch (error) {
    console.error("Create Assessment Error:", error);
    return jsonError("فشل في إنشاء التقييم", "SERVER_ERROR", 500);
  }
}
