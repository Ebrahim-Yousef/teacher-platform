import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

// GET: جلب قائمة الطلاب
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (
      !session ||
      !["TEACHER", "ASSISTANT", "SUPER_ADMIN"].includes(session.role)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "غير مصرح لك بالوصول" },
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10)),
    );
    const search = searchParams.get("search")?.trim() || "";
    const stage = searchParams.get("stage")?.trim() || "";
    const grade = searchParams.get("grade")?.trim() || "";

    let teacherId: string | null = session.userId;
    if (session.role === "ASSISTANT") {
      const assistantUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { teacherId: true },
      });
      teacherId = assistantUser?.teacherId || null;
    }

    const whereCondition: Record<string, unknown> = {
      ...(session.role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      ...(stage ? { stage } : {}),
      ...(grade ? { grade } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { studentPhone: { contains: search } },
              { parentPhone: { contains: search } },
            ],
          }
        : {}),
    };

    const totalStudents = await prisma.studentProfile.count({
      where: whereCondition,
    });
    const totalPages = Math.ceil(totalStudents / limit) || 1;

    const students = await prisma.studentProfile.findMany({
      where: whereCondition,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: students,
      meta: {
        currentPage: page,
        totalPages,
        total: totalStudents,
        limit,
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "خطأ غير معروف";
    console.error("Fetch Students Error:", errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "فشل في جلب بيانات الطلاب" },
      },
      { status: 500 },
    );
  }
}

// POST: إضافة طالب جديد وإنشاء حسابه المرتبط
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (
      !session ||
      !["TEACHER", "ASSISTANT", "SUPER_ADMIN"].includes(session.role)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "غير مصرح لك بالوصول" },
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { name, studentPhone, parentPhone, stage, grade } = body;

    if (!name || !studentPhone || !parentPhone || !stage || !grade) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "جميع الحقول الأساسية مطلوبة",
          },
        },
        { status: 400 },
      );
    }

    let teacherId: string | null = session.userId;
    if (session.role === "ASSISTANT") {
      const assistantUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { teacherId: true },
      });
      teacherId = assistantUser?.teacherId || null;
    }

    const cleanPhone = studentPhone.replace(/\D/g, "");
    const generatedEmail = `student_${cleanPhone}_${Date.now()}@platform.local`;
    const hashedPassword = await bcrypt.hash("123456", 10);

    // استخدام المعاملة (Transaction) لضمان إنشاء مستخدم وملف طالب معاَ
    const newStudent = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: generatedEmail,
          username: cleanPhone,
          password: hashedPassword,
          phone: studentPhone,
          role: "STUDENT",
          teacherId: teacherId || null,
        },
      });

      return tx.studentProfile.create({
        data: {
          name,
          studentPhone,
          parentPhone,
          stage,
          grade,
          userId: user.id,
          teacherId: teacherId || null,
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        data: newStudent,
        message: "تمت إضافة الطالب بنجاح",
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "خطأ غير معروف";
    console.error("Create Student Error:", errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "فشل في حفظ بيانات الطالب" },
      },
      { status: 500 },
    );
  }
}
