import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: subjectId } = await context.params;
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const subject = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
    });

    if (!subject) {
      return jsonError("المادة غير موجودة", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const { name, code } = body;

    if (!name || !name.trim()) {
      return jsonError("اسم الفرع مطلوب", "BAD_REQUEST", 400);
    }

    const branch = await prisma.subjectBranch.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        subjectId,
      },
    });

    return jsonSuccess(branch, 201);
  } catch (error) {
    console.error("Create Branch Error:", error);
    return jsonError("فشل في إضافة الفرع", "SERVER_ERROR", 500);
  }
}
