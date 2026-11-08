import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

function calculateBillingWindow(amountPaid: number, amountDue: number, month: string): string {
  const isFullyPaid = amountPaid >= amountDue && amountDue > 0;
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const dayOfMonth = now.getDate();

  if (isFullyPaid) {
    return dayOfMonth <= 5 && month === currentMonthStr ? "WITHIN_WINDOW" : "AFTER_WINDOW";
  }

  if (month < currentMonthStr || (month === currentMonthStr && dayOfMonth > 5)) {
    return "OVERDUE";
  }

  return "UNPAID";
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const month = searchParams.get("month")?.trim() || "";
    const studentId = searchParams.get("studentId")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";

    const where: Record<string, unknown> = {
      ...(role !== "SUPER_ADMIN" ? { teacherId } : {}),
      ...(month ? { month } : {}),
      ...(studentId ? { studentId } : {}),
      ...(status ? { status } : {}),
    };

    const total = await prisma.monthlyFee.count({ where });
    const totalPages = Math.ceil(total / limit) || 1;

    const fees = await prisma.monthlyFee.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        student: { select: { id: true, name: true } },
        group: { select: { id: true, name: true, defaultMonthlyFee: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = fees.map((f) => ({
      id: f.id,
      studentId: f.studentId,
      studentName: f.student.name,
      student: f.student,
      month: f.month,
      amountDue: f.amountDue,
      effectiveAmountDue: f.amountDue,
      effectiveMonthlyFee: f.amountDue,
      amountPaid: f.amountPaid,
      remaining: Math.max(0, f.amountDue - f.amountPaid),
      status: f.status,
      billingWindowStatus: f.billingWindowStatus,
      groupDefaultMonthlyFee: f.group?.defaultMonthlyFee,
    }));

    return jsonSuccess(formatted, {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    console.error("List Fees Error:", error);
    return jsonError("فشل في جلب الرسوم الشهرية", "SERVER_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { teacherId, userId } = authResult.auth;

    const body = await request.json();
    const { studentId, month, amountDue, groupId } = body;

    if (!studentId || !month || amountDue === undefined) {
      return jsonError("الطالب والشهر والمبلغ حقول مطلوبة", "BAD_REQUEST", 400);
    }

    const effectiveTeacherId = teacherId || userId;
    const due = Number(amountDue) || 0;
    const billingWindowStatus = calculateBillingWindow(0, due, month);

    const fee = await prisma.monthlyFee.upsert({
      where: {
        studentId_month_teacherId: {
          studentId: String(studentId),
          month: String(month),
          teacherId: effectiveTeacherId,
        },
      },
      update: {
        amountDue: due,
        ...(groupId ? { groupId: String(groupId) } : {}),
      },
      create: {
        teacherId: effectiveTeacherId,
        studentId: String(studentId),
        groupId: groupId ? String(groupId) : null,
        month: String(month),
        amountDue: due,
        amountPaid: 0,
        status: "UNPAID",
        billingWindowStatus,
      },
      include: {
        student: true,
      },
    });

    return jsonSuccess(fee, 201);
  } catch (error) {
    console.error("Create Fee Error:", error);
    return jsonError("فشل في حفظ الرسوم الشهرية", "SERVER_ERROR", 500);
  }
}
