import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonError } from "@/lib/serverAuth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month")?.trim() || "";

    const fees = await prisma.monthlyFee.findMany({
      where: {
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
        ...(month ? { month } : {}),
      },
      include: {
        student: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const statusMap: Record<string, string> = {
      PAID: "مدفوع",
      PARTIAL: "مدفوع جزئياً",
      UNPAID: "غير مدفوع",
    };

    const header = "اسم الطالب,الشهر,المبلغ المستحق,المبلغ المدفوع,المتبقي,الحالة\n";
    const rows = fees
      .map(
        (f) =>
          `"${f.student.name}","${f.month}","${f.amountDue}","${f.amountPaid}","${Math.max(0, f.amountDue - f.amountPaid)}","${statusMap[f.status] || f.status}"`,
      )
      .join("\n");

    const csvContent = "\uFEFF" + header + rows;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="finance.csv"',
      },
    });
  } catch (error) {
    console.error("Export Finance Error:", error);
    return jsonError("فشل في تصدير البيانات المالية", "SERVER_ERROR", 500);
  }
}
