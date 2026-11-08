import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";
import { getWhatsAppLink } from "@/utils/whatsapp";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: sessionId } = await context.params;
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const session = await prisma.attendanceSession.findFirst({
      where: {
        id: sessionId,
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
      include: {
        group: true,
      },
    });

    if (!session) {
      return jsonError("الحصة غير موجودة", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const records = Array.isArray(body.records) ? body.records : [];

    // Get teacher settings for custom whatsapp template if any
    const teacherSettings = teacherId
      ? await prisma.teacherSettings.findUnique({ where: { teacherId } })
      : null;
    const defaultTemplate =
      teacherSettings?.whatsappTemplate ||
      `نود إبلاغكم بأن الطالب تغيب عن حصة (${session.title}) بتاريخ ${session.date}.`;

    const whatsappLinks: Array<{
      studentId: string;
      studentName: string;
      parentPhone: string;
      url: string;
    }> = [];

    await prisma.$transaction(async (tx) => {
      for (const rec of records) {
        const studentId = String(rec.studentId);
        const status = String(rec.status || "PRESENT");
        const note = rec.note ? String(rec.note) : null;

        await tx.attendanceRecord.upsert({
          where: {
            sessionId_studentId: {
              sessionId,
              studentId,
            },
          },
          update: {
            status,
            note,
          },
          create: {
            sessionId,
            studentId,
            status,
            note,
          },
        });

        // If absent or late, prepare WhatsApp link
        if (status === "ABSENT" || status === "LATE") {
          const student = await tx.studentProfile.findUnique({
            where: { id: studentId },
          });

          if (student && student.parentPhone) {
            const statusArabic = status === "ABSENT" ? "تغيب عن" : "تأخر عن";
            const customMsg = `نود إبلاغكم بأن الطالب (${student.name}) ${statusArabic} حصة (${session.title}) بتاريخ ${session.date}.`;
            const waUrl = getWhatsAppLink(student.parentPhone, customMsg || defaultTemplate);

            whatsappLinks.push({
              studentId: student.id,
              studentName: student.name,
              parentPhone: student.parentPhone,
              url: waUrl,
            });
          }
        }
      }
    });

    return jsonSuccess({
      whatsappLinks,
    });
  } catch (error) {
    console.error("Upsert Records Error:", error);
    return jsonError("فشل في حفظ سجلات الحضور", "SERVER_ERROR", 500);
  }
}
