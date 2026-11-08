import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonError } from "@/lib/serverAuth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId")?.trim() || "";

    const records = await prisma.attendanceRecord.findMany({
      where: {
        ...(role !== "SUPER_ADMIN" && teacherId ? { session: { teacherId } } : {}),
        ...(groupId ? { session: { groupId } } : {}),
      },
      include: {
        student: true,
        session: {
          include: { group: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const statusMap: Record<string, string> = {
      PRESENT: "حاضر",
      ABSENT: "غائب",
      LATE: "متأخر",
    };

    const header = "اسم الطالب,المجموعة,عنوان الحصة,التاريخ,الحالة,ملاحظات\n";
    const rows = records
      .map(
        (r) =>
          `"${r.student.name}","${r.session.group.name}","${r.session.title}","${r.session.date}","${statusMap[r.status] || r.status}","${r.note || ""}"`,
      )
      .join("\n");

    const csvContent = "\uFEFF" + header + rows;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="attendance.csv"',
      },
    });
  } catch (error) {
    console.error("Export Attendance Error:", error);
    return jsonError("فشل في تصدير الحضور", "SERVER_ERROR", 500);
  }
}
