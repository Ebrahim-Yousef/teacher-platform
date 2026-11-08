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
      return jsonSuccess({ records: [], summary: { present: 0, absent: 0, late: 0, attendanceRate: 0 } });
    }

    const records = await prisma.attendanceRecord.findMany({
      where: { studentId: student.id },
      include: {
        session: {
          include: {
            group: { select: { name: true } },
            teacher: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let present = 0;
    let absent = 0;
    let late = 0;

    const formatted = records.map((r) => {
      if (r.status === "PRESENT") present++;
      else if (r.status === "ABSENT") absent++;
      else if (r.status === "LATE") late++;

      return {
        id: r.id,
        date: r.session.date,
        status: r.status,
        teacher: r.session.teacher,
        teacherName: r.session.teacher?.name,
        session: {
          date: r.session.date,
          title: r.session.title,
          name: r.session.title,
        },
        group: {
          title: r.session.group.name,
          name: r.session.group.name,
        },
      };
    });

    const total = records.length;
    const attendanceRate = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 0;

    return jsonSuccess({
      records: formatted,
      history: formatted,
      items: formatted,
      summary: {
        present,
        absent,
        late,
        PRESENT: present,
        ABSENT: absent,
        LATE: late,
        attendanceRate,
        rate: attendanceRate,
      },
    });
  } catch (error) {
    console.error("Student Attendance Error:", error);
    return jsonError("فشل في جلب سجل حضور الطالب", "SERVER_ERROR", 500);
  }
}
