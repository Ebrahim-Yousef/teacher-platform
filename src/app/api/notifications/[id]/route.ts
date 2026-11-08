import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonError } from "@/lib/serverAuth";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const authResult = await requireAuth();
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { userId } = authResult.auth;

    await prisma.notification.deleteMany({
      where: {
        id,
        userId,
      },
    });

    return NextResponse.json({ success: true, message: "تم حذف الإشعار" });
  } catch (error) {
    console.error("Delete Notification Error:", error);
    return jsonError("فشل في حذف الإشعار", "SERVER_ERROR", 500);
  }
}
