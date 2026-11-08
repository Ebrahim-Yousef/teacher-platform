import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonError } from "@/lib/serverAuth";

export async function POST() {
  try {
    const authResult = await requireAuth();
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { userId } = authResult.auth;

    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, message: "تم تحديد جميع الإشعارات كمقروءة" });
  } catch (error) {
    console.error("Read All Error:", error);
    return jsonError("فشل في تحديد الإشعارات كمقروءة", "SERVER_ERROR", 500);
  }
}
