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

    const subject = await prisma.subject.findFirst({
      where: {
        id,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
      include: {
        branches: true,
      },
    });

    if (!subject) {
      return jsonError("المادة غير موجودة", "NOT_FOUND", 404);
    }

    return jsonSuccess(subject);
  } catch (error) {
    console.error("Get Subject Error:", error);
    return jsonError("فشل في جلب بيانات المادة", "SERVER_ERROR", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const existing = await prisma.subject.findFirst({
      where: {
        id,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
    });

    if (!existing) {
      return jsonError("المادة غير موجودة", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const { name, code, isActive } = body;

    const updated = await prisma.subject.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(code !== undefined ? { code: code ? code.trim() : null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
      include: {
        branches: true,
      },
    });

    return jsonSuccess(updated);
  } catch (error) {
    console.error("Update Subject Error:", error);
    return jsonError("فشل في تحديث المادة", "SERVER_ERROR", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const existing = await prisma.subject.findFirst({
      where: {
        id,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
    });

    if (!existing) {
      return jsonError("المادة غير موجودة", "NOT_FOUND", 404);
    }

    await prisma.subject.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "تم حذف المادة بنجاح" });
  } catch (error) {
    console.error("Delete Subject Error:", error);
    return jsonError("فشل في حذف المادة", "SERVER_ERROR", 500);
  }
}
