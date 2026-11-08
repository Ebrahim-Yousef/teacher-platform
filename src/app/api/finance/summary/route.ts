import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month")?.trim() || "";

    const where: Record<string, unknown> = {
      ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      ...(month ? { month } : {}),
    };

    const fees = await prisma.monthlyFee.findMany({ where });

    let expected = 0;
    let collected = 0;
    const byBillingWindow: Record<string, number> = {
      UNPAID: 0,
      WITHIN_WINDOW: 0,
      AFTER_WINDOW: 0,
      OVERDUE: 0,
    };

    for (const f of fees) {
      expected += f.amountDue;
      collected += f.amountPaid;
      const bw = f.billingWindowStatus || "UNPAID";
      byBillingWindow[bw] = (byBillingWindow[bw] || 0) + 1;
    }

    const remaining = Math.max(0, expected - collected);

    return jsonSuccess({
      expected,
      collected,
      remaining,
      byBillingWindow,
    });
  } catch (error) {
    console.error("Finance Summary Error:", error);
    return jsonError("فشل في جلب ملخص المالية", "SERVER_ERROR", 500);
  }
}
