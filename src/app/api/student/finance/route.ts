import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

export async function GET() {
  try {
    const authResult = await requireAuth(["STUDENT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { userId } = authResult.auth;

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!student) {
      return jsonSuccess({ fees: [] });
    }

    const fees = await prisma.monthlyFee.findMany({
      where: { studentId: student.id },
      include: {
        teacher: { select: { id: true, name: true } },
      },
      orderBy: { month: "desc" },
    });

    const formatted = fees.map((f) => ({
      id: f.id,
      month: f.month,
      title: `اشتراك شهر ${f.month}`,
      amountDue: f.amountDue,
      effectiveAmountDue: f.amountDue,
      due: f.amountDue,
      amount: f.amountDue,
      amountPaid: f.amountPaid,
      paid: f.amountPaid,
      status: f.status,
      billingWindowStatus: f.billingWindowStatus,
      teacher: f.teacher,
      teacherName: f.teacher?.name,
    }));

    return jsonSuccess({ fees: formatted });
  } catch (error) {
    console.error("Student Finance Error:", error);
    return jsonError("فشل في جلب البيانات المالية للطالب", "SERVER_ERROR", 500);
  }
}
