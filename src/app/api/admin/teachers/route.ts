import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";
import bcrypt from "bcryptjs";

// GET: جلب قائمة المعلمين
export async function GET() {
  try {
    const authResult = await requireAuth(["SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;

    const teachers = await prisma.user.findMany({
      where: { role: "TEACHER" },
      include: { subscription: true },
      orderBy: { createdAt: "desc" },
    });

    return jsonSuccess(teachers);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف";
    console.error("Get Admin Teachers Error:", errorMessage);
    return jsonError(errorMessage, "SERVER_ERROR", 500);
  }
}

// POST: إنشاء معلم جديد
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(["SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;

    const body = await request.json();
    const { name, username, password } = body;

    if (!name || !username || !password) {
      return jsonError("جميع الحقول (الاسم، اسم المستخدم، كلمة المرور) مطلوبة", "VALIDATION_ERROR", 400);
    }

    const cleanUsername = String(username).trim().toLowerCase();

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: cleanUsername }, { email: `${cleanUsername}@platform.local` }],
      },
    });

    if (existingUser) {
      return jsonError("اسم المستخدم مستخدم بالفعل، يرجى اختيار اسم آخر", "CONFLICT", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const generatedEmail = `${cleanUsername}@platform.local`;

    const newTeacher = await prisma.user.create({
      data: {
        name: name.trim(),
        username: cleanUsername,
        email: generatedEmail,
        password: hashedPassword,
        role: "TEACHER",
        subscription: {
          create: {
            status: "ACTIVE",
          },
        },
      },
      include: {
        subscription: true,
      },
    });

    return jsonSuccess(newTeacher, 201);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف";
    console.error("Create Admin Teacher Error:", errorMessage);
    return jsonError(errorMessage, "SERVER_ERROR", 500);
  }
}
