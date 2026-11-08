import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

type RouteContext = { params: Promise<{ id: string; branchId: string }> };

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: subjectId, branchId } = await context.params;
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const branch = await prisma.subjectBranch.findFirst({
      where: {
        id: branchId,
        subjectId,
        ...(role !== "SUPER_ADMIN" && teacherId ? { subject: { teacherId } } : {}),
      },
    });

    if (!branch) {
      return jsonError("الفرع غير موجود", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const { name, code } = body;

    const updated = await prisma.subjectBranch.update({
      where: { id: branchId },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(code !== undefined ? { code: code ? code.trim() : null } : {}),
      },
    });

    return jsonSuccess(updated);
  } catch (error) {
    console.error("Update Branch Error:", error);
    return jsonError("فشل في تحديث الفرع", "SERVER_ERROR", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: subjectId, branchId } = await context.params;
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const branch = await prisma.subjectBranch.findFirst({
      where: {
        id: branchId,
        subjectId,
        ...(role !== "SUPER_ADMIN" && teacherId ? { subject: { teacherId } } : {}),
      },
    });

    if (!branch) {
      return jsonError("الفرع غير موجود", "NOT_FOUND", 404);
    }

    await prisma.subjectBranch.delete({
      where: { id: branchId },
    });

    return NextResponse.json({ success: true, message: "تم حذف الفرع بنجاح" });
  } catch (error) {
    console.error("Delete Branch Error:", error);
    return jsonError("فشل في حذف الفرع", "SERVER_ERROR", 500);
  }
}
