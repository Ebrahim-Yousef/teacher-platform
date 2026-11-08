import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonError } from "@/lib/serverAuth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const assessment = await prisma.assessment.findFirst({
      where: {
        id,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
    });

    if (!assessment) {
      return jsonError("التقييم غير موجود", "NOT_FOUND", 404);
    }

    await prisma.assessment.update({
      where: { id },
      data: { isPublished: true },
    });

    return NextResponse.json({ success: true, message: "تم نشر التقييم بنجاح" });
  } catch (error) {
    console.error("Publish Assessment Error:", error);
    return jsonError("فشل في نشر التقييم", "SERVER_ERROR", 500);
  }
}
