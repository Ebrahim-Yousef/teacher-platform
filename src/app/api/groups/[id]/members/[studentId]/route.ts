import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

type RouteContext = { params: Promise<{ id: string; studentId: string }> };

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: groupId, studentId } = await context.params;
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
    const monthlyFeeOverride =
      body.monthlyFeeOverride !== undefined && body.monthlyFeeOverride !== "" && body.monthlyFeeOverride !== null
        ? Number(body.monthlyFeeOverride)
        : null;

    const updated = await prisma.groupMember.update({
      where: {
        groupId_studentId: {
          groupId,
          studentId,
        },
      },
      data: {
        monthlyFeeOverride,
      },
      include: {
        student: true,
      },
    });

    return jsonSuccess(updated);
  } catch (error) {
    console.error("Update Group Member Error:", error);
    return jsonError("فشل في تعديل سعر الطالب", "SERVER_ERROR", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: groupId, studentId } = await context.params;
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

    await prisma.groupMember.deleteMany({
      where: {
        groupId,
        studentId,
      },
    });

    return NextResponse.json({ success: true, message: "تم حذف الطالب من المجموعة" });
  } catch (error) {
    console.error("Remove Group Member Error:", error);
    return jsonError("فشل في حذف الطالب من المجموعة", "SERVER_ERROR", 500);
  }
}
