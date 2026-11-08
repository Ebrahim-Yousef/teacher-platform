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

    const group = await prisma.group.findFirst({
      where: {
        id,
        ...((role === "TEACHER" || role === "ASSISTANT") && teacherId ? { teacherId } : {}),
      },
      include: {
        subject: true,
        members: {
          include: {
            student: true,
          },
        },
        scheduleSlots: true,
      },
    });

    if (!group) {
      return jsonError("المجموعة غير موجودة", "NOT_FOUND", 404);
    }

    const formatted = {
      id: group.id,
      name: group.name,
      stage: group.stage,
      grade: group.grade,
      subjectId: group.subjectId,
      subjectName: group.subject?.name,
      subject: group.subject,
      defaultMonthlyFee: group.defaultMonthlyFee,
      isActive: group.isActive,
      members: group.members.map((m) => ({
        id: m.id,
        studentId: m.studentId,
        name: m.student.name,
        studentName: m.student.name,
        monthlyFeeOverride: m.monthlyFeeOverride,
        effectiveMonthlyFee: m.monthlyFeeOverride ?? group.defaultMonthlyFee,
        hasCustomPrice: m.monthlyFeeOverride !== null && m.monthlyFeeOverride !== undefined,
      })),
      students: group.members.map((m) => ({
        id: m.id,
        studentId: m.studentId,
        name: m.student.name,
        studentName: m.student.name,
        monthlyFeeOverride: m.monthlyFeeOverride,
        effectiveMonthlyFee: m.monthlyFeeOverride ?? group.defaultMonthlyFee,
        hasCustomPrice: m.monthlyFeeOverride !== null && m.monthlyFeeOverride !== undefined,
      })),
      scheduleSlots: group.scheduleSlots,
      schedule: group.scheduleSlots,
    };

    return jsonSuccess(formatted);
  } catch (error) {
    console.error("Get Group Error:", error);
    return jsonError("فشل في جلب بيانات المجموعة", "SERVER_ERROR", 500);
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

    const existing = await prisma.group.findFirst({
      where: {
        id,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
    });

    if (!existing) {
      return jsonError("المجموعة غير موجودة", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const { name, stage, grade, subjectId, defaultMonthlyFee, isActive } = body;

    const updated = await prisma.group.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(stage !== undefined ? { stage } : {}),
        ...(grade !== undefined ? { grade } : {}),
        ...(subjectId !== undefined ? { subjectId: subjectId || null } : {}),
        ...(defaultMonthlyFee !== undefined ? { defaultMonthlyFee: Number(defaultMonthlyFee) || 0 } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
      include: {
        subject: true,
        members: { include: { student: true } },
        scheduleSlots: true,
      },
    });

    return jsonSuccess(updated);
  } catch (error) {
    console.error("Update Group Error:", error);
    return jsonError("فشل في تحديث المجموعة", "SERVER_ERROR", 500);
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

    const existing = await prisma.group.findFirst({
      where: {
        id,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
    });

    if (!existing) {
      return jsonError("المجموعة غير موجودة", "NOT_FOUND", 404);
    }

    await prisma.group.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "تم حذف المجموعة بنجاح" });
  } catch (error) {
    console.error("Delete Group Error:", error);
    return jsonError("فشل في حذف المجموعة", "SERVER_ERROR", 500);
  }
}
