import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: groupId } = await context.params;
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
    });

    if (!group) {
      return jsonError("المجموعة غير موجودة", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const studentId = String(body.studentId);
    const monthlyFeeOverride =
      body.monthlyFeeOverride !== undefined && body.monthlyFeeOverride !== "" && body.monthlyFeeOverride !== null
        ? Number(body.monthlyFeeOverride)
        : null;

    if (!studentId) {
      return jsonError("معرف الطالب مطلوب", "BAD_REQUEST", 400);
    }

    const member = await prisma.groupMember.upsert({
      where: {
        groupId_studentId: {
          groupId,
          studentId,
        },
      },
      update: {
        monthlyFeeOverride,
      },
      create: {
        groupId,
        studentId,
        monthlyFeeOverride,
      },
      include: {
        student: true,
      },
    });

    return jsonSuccess(member, 201);
  } catch (error) {
    console.error("Add Group Member Error:", error);
    return jsonError("فشل في إضافة الطالب للمجموعة", "SERVER_ERROR", 500);
  }
}
