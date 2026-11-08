import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const existing = await prisma.monthlyFee.findFirst({
      where: {
        id,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
    });

    if (!existing) {
      return jsonError("الرسوم غير موجودة", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const { amountDue, status } = body;

    const due = amountDue !== undefined ? Number(amountDue) : existing.amountDue;
    const paid = existing.amountPaid;
    let nextStatus = status;
    if (!nextStatus) {
      if (paid >= due && due > 0) nextStatus = "PAID";
      else if (paid > 0) nextStatus = "PARTIAL";
      else nextStatus = "UNPAID";
    }

    const updated = await prisma.monthlyFee.update({
      where: { id },
      data: {
        ...(amountDue !== undefined ? { amountDue: due } : {}),
        status: nextStatus,
      },
    });

    return jsonSuccess(updated);
  } catch (error) {
    console.error("Update Fee Error:", error);
    return jsonError("فشل في تعديل الرسوم", "SERVER_ERROR", 500);
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

    const existing = await prisma.monthlyFee.findFirst({
      where: {
        id,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
    });

    if (!existing) {
      return jsonError("الرسوم غير موجودة", "NOT_FOUND", 404);
    }

    await prisma.monthlyFee.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "تم حذف الرسوم بنجاح" });
  } catch (error) {
    console.error("Delete Fee Error:", error);
    return jsonError("فشل في حذف الرسوم", "SERVER_ERROR", 500);
  }
}
