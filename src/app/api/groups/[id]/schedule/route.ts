import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: groupId } = await context.params;
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN", "STUDENT"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        ...((role === "TEACHER" || role === "ASSISTANT") && teacherId ? { teacherId } : {}),
      },
      include: {
        scheduleSlots: true,
      },
    });

    if (!group) {
      return jsonError("المجموعة غير موجودة", "NOT_FOUND", 404);
    }

    return jsonSuccess({ slots: group.scheduleSlots });
  } catch (error) {
    console.error("Get Group Schedule Error:", error);
    return jsonError("فشل في جلب جدول المجموعة", "SERVER_ERROR", 500);
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: groupId } = await context.params;
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
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
    const slots = Array.isArray(body.slots) ? body.slots : [];

    await prisma.$transaction(async (tx) => {
      await tx.groupScheduleSlot.deleteMany({
        where: { groupId },
      });

      if (slots.length > 0) {
        await tx.groupScheduleSlot.createMany({
          data: slots.map((s: { dayOfWeek: number; startTime: string; endTime: string }) => ({
            groupId,
            dayOfWeek: Number(s.dayOfWeek),
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        });
      }
    });

    const updatedSlots = await prisma.groupScheduleSlot.findMany({
      where: { groupId },
      orderBy: { dayOfWeek: "asc" },
    });

    return NextResponse.json({ success: true, message: "تم حفظ جدول المجموعة بنجاح", data: { slots: updatedSlots } });
  } catch (error) {
    console.error("Save Group Schedule Error:", error);
    return jsonError("فشل في حفظ جدول المجموعة", "SERVER_ERROR", 500);
  }
}
