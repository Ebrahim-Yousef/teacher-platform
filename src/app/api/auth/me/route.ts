export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "غير مصرح بالوصول" },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        subscription: {
          select: {
            status: true,
            expiresAt: true,
          },
        },
        student: {
          select: {
            id: true,
            stage: true,
            grade: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "المستخدم غير موجود" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get Me Session Error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء جلب بيانات الجلسة" },
      { status: 500 },
    );
  }
}
