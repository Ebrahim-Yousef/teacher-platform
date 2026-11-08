import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/hash";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = String(body.username || body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");

    if (!identifier || !password) {
      return NextResponse.json(
        {
          error: {
            message: "يرجى تقديم اسم المستخدم/البريد وكلمة المرور",
            code: "INVALID_INPUT",
          },
        },
        { status: 400 },
      );
    }

    // البحث بالبريد الإلكتروني، اسم المستخدم، أو الاسم
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier },
          { name: identifier },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: {
            message: "بيانات الدخول غير صحيحة",
            code: "INVALID_CREDENTIALS",
          },
        },
        { status: 401 },
      );
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          error: {
            message: "بيانات الدخول غير صحيحة",
            code: "INVALID_CREDENTIALS",
          },
        },
        { status: 401 },
      );
    }

    // توحيد الدور بالحروف الكبيرة تماماً كما يتطلبه الـ Middleware
    const token = await createSessionToken({
      userId: user.id,
      role: user.role, // مثل SUPER_ADMIN
      email: user.email,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      data: {
        accessToken: token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      {
        error: {
          message: "حدث خطأ غير متوقع في السيرفر",
          code: "SERVER_ERROR",
        },
      },
      { status: 500 },
    );
  }
}
