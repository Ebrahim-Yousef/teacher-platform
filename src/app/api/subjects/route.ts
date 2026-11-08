import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN", "STUDENT"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const { searchParams } = new URL(request.url);
    const isActiveParam = searchParams.get("isActive");

    const whereCondition: Record<string, unknown> = {};
    if ((role === "TEACHER" || role === "ASSISTANT") && teacherId) {
      whereCondition.teacherId = teacherId;
    }
    if (isActiveParam !== null && isActiveParam !== undefined && isActiveParam !== "") {
      whereCondition.isActive = isActiveParam === "true";
    }

    const subjects = await prisma.subject.findMany({
      where: whereCondition,
      include: {
        branches: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonSuccess(subjects);
  } catch (error) {
    console.error("List Subjects Error:", error);
    return jsonError("فشل في جلب قائمة المواد", "SERVER_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { userId } = authResult.auth;

    const body = await request.json();
    const { name, code, isActive } = body;

    if (!name || !name.trim()) {
      return jsonError("اسم المادة مطلوب", "BAD_REQUEST", 400);
    }

    const subject = await prisma.subject.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        isActive: typeof isActive === "boolean" ? isActive : true,
        teacherId: userId,
      },
      include: {
        branches: true,
      },
    });

    return jsonSuccess(subject, 201);
  } catch (error) {
    console.error("Create Subject Error:", error);
    return jsonError("فشل في إنشاء المادة", "SERVER_ERROR", 500);
  }
}
