import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN", "STUDENT"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const search = searchParams.get("search")?.trim() || "";
    const stage = searchParams.get("stage")?.trim() || "";
    const grade = searchParams.get("grade")?.trim() || "";
    const subjectId = searchParams.get("subjectId")?.trim() || "";
    const isActiveParam = searchParams.get("isActive");

    const where: Record<string, unknown> = {
      ...((role === "TEACHER" || role === "ASSISTANT") && teacherId ? { teacherId } : {}),
      ...(stage ? { stage } : {}),
      ...(grade ? { grade } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(isActiveParam !== null && isActiveParam !== undefined && isActiveParam !== ""
        ? { isActive: isActiveParam === "true" }
        : {}),
      ...(search ? { name: { contains: search } } : {}),
    };

    const total = await prisma.group.count({ where });
    const totalPages = Math.ceil(total / limit) || 1;

    const groups = await prisma.group.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        subject: { select: { id: true, name: true } },
        members: {
          include: {
            student: true,
          },
        },
        scheduleSlots: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform format for frontend expectations
    const formatted = groups.map((g) => ({
      id: g.id,
      name: g.name,
      stage: g.stage,
      grade: g.grade,
      subjectId: g.subjectId,
      subjectName: g.subject?.name,
      subject: g.subject,
      defaultMonthlyFee: g.defaultMonthlyFee,
      isActive: g.isActive,
      members: g.members.map((m) => ({
        id: m.id,
        studentId: m.studentId,
        name: m.student.name,
        studentName: m.student.name,
        monthlyFeeOverride: m.monthlyFeeOverride,
        effectiveMonthlyFee: m.monthlyFeeOverride ?? g.defaultMonthlyFee,
        hasCustomPrice: m.monthlyFeeOverride !== null && m.monthlyFeeOverride !== undefined,
      })),
      students: g.members.map((m) => ({
        id: m.id,
        studentId: m.studentId,
        name: m.student.name,
        studentName: m.student.name,
        monthlyFeeOverride: m.monthlyFeeOverride,
        effectiveMonthlyFee: m.monthlyFeeOverride ?? g.defaultMonthlyFee,
        hasCustomPrice: m.monthlyFeeOverride !== null && m.monthlyFeeOverride !== undefined,
      })),
      scheduleSlots: g.scheduleSlots,
      schedule: g.scheduleSlots,
    }));

    return jsonSuccess(formatted, {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    console.error("List Groups Error:", error);
    return jsonError("فشل في جلب قائمة المجموعات", "SERVER_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { teacherId, userId } = authResult.auth;

    const body = await request.json();
    const { name, stage, grade, subjectId, defaultMonthlyFee, isActive } = body;

    if (!name || !stage || !grade) {
      return jsonError("اسم المجموعة والمرحلة والصف حقول مطلوبة", "BAD_REQUEST", 400);
    }

    const effectiveTeacherId = teacherId || userId;

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        stage,
        grade,
        subjectId: subjectId || null,
        defaultMonthlyFee: Number(defaultMonthlyFee) || 0,
        isActive: typeof isActive === "boolean" ? isActive : true,
        teacherId: effectiveTeacherId,
      },
      include: {
        subject: true,
        members: { include: { student: true } },
        scheduleSlots: true,
      },
    });

    return jsonSuccess(group, 201);
  } catch (error) {
    console.error("Create Group Error:", error);
    return jsonError("فشل في إنشاء المجموعة", "SERVER_ERROR", 500);
  }
}
