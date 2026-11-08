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

    const session = await prisma.attendanceSession.findFirst({
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
        records: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!session) {
      return jsonError("الحصة غير موجودة", "NOT_FOUND", 404);
    }

    const members = session.group.members.map((m) => ({
      id: m.student.id,
      studentId: m.student.id,
      name: m.student.name,
      parentPhone: m.student.parentPhone,
    }));

    const formatted = {
      ...session,
      members,
    };

    return jsonSuccess(formatted);
  } catch (error) {
    console.error("Get Session Error:", error);
    return jsonError("فشل في جلب بيانات الحصة", "SERVER_ERROR", 500);
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

    const existing = await prisma.attendanceSession.findFirst({
      where: {
        id,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
    });

    if (!existing) {
      return jsonError("الحصة غير موجودة", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const { title, date, startTime, endTime, notes, subjectBranchId } = body;

    const updated = await prisma.attendanceSession.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(date !== undefined ? { date } : {}),
        ...(startTime !== undefined ? { startTime } : {}),
        ...(endTime !== undefined ? { endTime } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(subjectBranchId !== undefined ? { subjectBranchId: subjectBranchId || null } : {}),
      },
      include: {
        group: true,
        records: true,
      },
    });

    return jsonSuccess(updated);
  } catch (error) {
    console.error("Update Session Error:", error);
    return jsonError("فشل في تحديث الحصة", "SERVER_ERROR", 500);
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

    const existing = await prisma.attendanceSession.findFirst({
      where: {
        id,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
    });

    if (!existing) {
      return jsonError("الحصة غير موجودة", "NOT_FOUND", 404);
    }

    await prisma.attendanceSession.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "تم حذف الحصة بنجاح" });
  } catch (error) {
    console.error("Delete Session Error:", error);
    return jsonError("فشل في حذف الحصة", "SERVER_ERROR", 500);
  }
}
