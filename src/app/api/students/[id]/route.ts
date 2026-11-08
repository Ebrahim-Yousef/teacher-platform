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
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const student = await prisma.studentProfile.findFirst({
      where: {
        id,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
    });

    if (!student) {
      return jsonError("الطالب غير موجود", "NOT_FOUND", 404);
    }

    return jsonSuccess(student);
  } catch (error) {
    console.error("Get Student Error:", error);
    return jsonError("فشل في جلب بيانات الطالب", "SERVER_ERROR", 500);
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

    const existingStudent = await prisma.studentProfile.findFirst({
      where: {
        id,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
    });

    if (!existingStudent) {
      return jsonError("الطالب غير موجود", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const { name, studentPhone, parentPhone, stage, grade } = body;

    const updated = await prisma.$transaction(async (tx) => {
      if (name || studentPhone) {
        await tx.user.update({
          where: { id: existingStudent.userId },
          data: {
            ...(name ? { name } : {}),
            ...(studentPhone ? { phone: studentPhone } : {}),
          },
        });
      }

      return tx.studentProfile.update({
        where: { id },
        data: {
          ...(name ? { name } : {}),
          ...(studentPhone ? { studentPhone } : {}),
          ...(parentPhone ? { parentPhone } : {}),
          ...(stage ? { stage } : {}),
          ...(grade ? { grade } : {}),
        },
      });
    });

    return jsonSuccess(updated);
  } catch (error) {
    console.error("Update Student Error:", error);
    return jsonError("فشل في تحديث بيانات الطالب", "SERVER_ERROR", 500);
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

    const student = await prisma.studentProfile.findFirst({
      where: {
        id,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
    });

    if (!student) {
      return jsonError("الطالب غير موجود", "NOT_FOUND", 404);
    }

    // Cascade delete via User
    await prisma.user.delete({
      where: { id: student.userId },
    });

    return NextResponse.json({ success: true, message: "تم حذف الطالب بنجاح" });
  } catch (error) {
    console.error("Delete Student Error:", error);
    return jsonError("فشل في حذف الطالب", "SERVER_ERROR", 500);
  }
}
