import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId")?.trim() || "";
    const monthlyFeeId = searchParams.get("monthlyFeeId")?.trim() || "";

    const where: Record<string, unknown> = {
      ...(role !== "SUPER_ADMIN" ? { teacherId } : {}),
      ...(studentId ? { studentId } : {}),
      ...(monthlyFeeId ? { monthlyFeeId } : {}),
    };

    const payments = await prisma.payment.findMany({
      where,
      include: {
        student: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    });

    return jsonSuccess(payments);
  } catch (error) {
    console.error("List Payments Error:", error);
    return jsonError("فشل في جلب قائمة المدفوعات", "SERVER_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { teacherId, userId } = authResult.auth;

    const body = await request.json();
    const studentId = String(body.studentId || "");
    const monthlyFeeId = body.monthlyFeeId || body.feeId || null;
    const amount = Number(body.amount) || 0;
    const notes = body.notes ? String(body.notes) : null;

    if (!studentId || amount <= 0) {
      return jsonError("الطالب ومبلغ صالح مطلوبان", "BAD_REQUEST", 400);
    }

    const effectiveTeacherId = teacherId || userId;

    const payment = await prisma.$transaction(async (tx) => {
      let fee = null;
      if (monthlyFeeId) {
        fee = await tx.monthlyFee.findUnique({
          where: { id: String(monthlyFeeId) },
        });
      }

      if (!fee) {
        // Find latest unpaid fee for this student
        fee = await tx.monthlyFee.findFirst({
          where: {
            studentId,
            teacherId: effectiveTeacherId,
            status: { not: "PAID" },
          },
          orderBy: { month: "desc" },
        });
      }

      const p = await tx.payment.create({
        data: {
          teacherId: effectiveTeacherId,
          studentId,
          monthlyFeeId: fee?.id || null,
          amount,
          notes,
        },
      });

      if (fee) {
        const newPaid = fee.amountPaid + amount;
        let newStatus = fee.status;
        if (newPaid >= fee.amountDue && fee.amountDue > 0) newStatus = "PAID";
        else if (newPaid > 0) newStatus = "PARTIAL";

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        let newWindow = fee.billingWindowStatus;
        if (newStatus === "PAID") {
          newWindow = now.getDate() <= 5 && fee.month === currentMonth ? "WITHIN_WINDOW" : "AFTER_WINDOW";
        }

        await tx.monthlyFee.update({
          where: { id: fee.id },
          data: {
            amountPaid: newPaid,
            status: newStatus,
            billingWindowStatus: newWindow,
          },
        });
      }

      return p;
    });

    return jsonSuccess(payment, 201);
  } catch (error) {
    console.error("Create Payment Error:", error);
    return jsonError("فشل في تسجيل الدفعة", "SERVER_ERROR", 500);
  }
}
