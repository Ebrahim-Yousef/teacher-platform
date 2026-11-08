import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId")?.trim() || "";
    const month = searchParams.get("month")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const billingWindowStatus = searchParams.get("billingWindowStatus")?.trim() || "";

    if (!groupId) {
      return jsonSuccess([]);
    }

    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
      include: {
        members: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!group) {
      return jsonSuccess([]);
    }

    // Find all monthly fees for these students for the given month
    const studentIds = group.members.map((m) => m.studentId);
    const existingFees = await prisma.monthlyFee.findMany({
      where: {
        groupId,
        studentId: { in: studentIds },
        ...(month ? { month } : {}),
      },
    });

    const feeMap = new Map(existingFees.map((f) => [f.studentId, f]));

    let items = group.members.map((m) => {
      const fee = feeMap.get(m.studentId);
      const effectiveMonthlyFee = m.monthlyFeeOverride ?? group.defaultMonthlyFee;
      const amountDue = fee ? fee.amountDue : effectiveMonthlyFee;
      const amountPaid = fee ? fee.amountPaid : 0;
      const feeStatus = fee ? fee.status : amountPaid >= amountDue && amountDue > 0 ? "PAID" : "UNPAID";
      const bWindow = fee ? fee.billingWindowStatus : "UNPAID";

      return {
        id: fee ? fee.id : `${m.groupId}_${m.studentId}`,
        studentId: m.studentId,
        studentName: m.student.name,
        student: { name: m.student.name },
        monthlyFeeId: fee?.id || null,
        effectiveMonthlyFee,
        effectiveAmountDue: amountDue,
        amountDue,
        amountPaid,
        remaining: Math.max(0, amountDue - amountPaid),
        status: feeStatus,
        billingWindowStatus: bWindow,
        hasCustomPrice: m.monthlyFeeOverride !== null && m.monthlyFeeOverride !== undefined,
        monthlyFeeOverride: m.monthlyFeeOverride,
        groupDefaultMonthlyFee: group.defaultMonthlyFee,
        month,
      };
    });

    if (status) {
      items = items.filter((item) => item.status === status);
    }
    if (billingWindowStatus) {
      items = items.filter((item) => item.billingWindowStatus === billingWindowStatus);
    }

    return jsonSuccess(items);
  } catch (error) {
    console.error("List Finance Subscriptions Error:", error);
    return jsonError("فشل في جلب اشتراكات المجموعة", "SERVER_ERROR", 500);
  }
}
