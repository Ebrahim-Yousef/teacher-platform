import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonError } from "@/lib/serverAuth";

export async function GET() {
  try {
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const students = await prisma.studentProfile.findMany({
      where: {
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    // CSV with UTF-8 BOM for Arabic support
    const header = "اسم الطالب,رقم هاتف الطالب,رقم هاتف ولي الأمر,المرحلة,الصف الدراسى,تاريخ الإضافة\n";
    const rows = students
      .map(
        (s) =>
          `"${s.name}","${s.studentPhone}","${s.parentPhone}","${s.stage}","${s.grade}","${s.createdAt.toISOString().split("T")[0]}"`,
      )
      .join("\n");

    const csvContent = "\uFEFF" + header + rows;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="students.csv"',
      },
    });
  } catch (error) {
    console.error("Export Students Error:", error);
    return jsonError("فشل في تصدير بيانات الطلاب", "SERVER_ERROR", 500);
  }
}
