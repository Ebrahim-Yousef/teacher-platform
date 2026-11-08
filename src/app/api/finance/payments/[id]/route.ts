import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonError } from "@/lib/serverAuth";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const payment = await prisma.payment.findFirst({
      where: {
        id,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
    });

    if (!payment) {
      return jsonError("الدفعة غير موجودة", "NOT_FOUND", 404);
    }

    await prisma.$transaction(async (tx) => {
      if (payment.monthlyFeeId) {
        const fee = await tx.monthlyFee.findUnique({
          where: { id: payment.monthlyFeeId },
        });

        if (fee) {
          const newPaid = Math.max(0, fee.amountPaid - payment.amount);
          let newStatus = fee.status;
          if (newPaid >= fee.amountDue && fee.amountDue > 0) newStatus = "PAID";
          else if (newPaid > 0) newStatus = "PARTIAL";
          else newStatus = "UNPAID";

          await tx.monthlyFee.update({
            where: { id: fee.id },
            data: {
              amountPaid: newPaid,
              status: newStatus,
            },
          });
        }
      }

      await tx.payment.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, message: "تم حذف الدفعة بنجاح" });
  } catch (error) {
    console.error("Delete Payment Error:", error);
    return jsonError("فشل في حذف الدفعة", "SERVER_ERROR", 500);
  }
}
