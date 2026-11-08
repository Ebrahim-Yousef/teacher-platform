import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonError } from "@/lib/serverAuth";

export async function GET() {
  try {
    const authResult = await requireAuth();
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { userId } = authResult.auth;

    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Get Unread Count Error:", error);
    return jsonError("فشل في جلب عدد الإشعارات غير المقروءة", "SERVER_ERROR", 500);
  }
}
