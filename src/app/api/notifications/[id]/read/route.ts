import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonError } from "@/lib/serverAuth";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const authResult = await requireAuth();
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { userId } = authResult.auth;

    await prisma.notification.updateMany({
      where: {
        id,
        userId,
      },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, message: "تم تحديد الإشعار كمقروء" });
  } catch (error) {
    console.error("Mark Read Error:", error);
    return jsonError("فشل في تحديث حالة الإشعار", "SERVER_ERROR", 500);
  }
}
