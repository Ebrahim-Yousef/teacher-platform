import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonError } from "@/lib/serverAuth";

export async function POST() {
  try {
    const authResult = await requireAuth();
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { userId } = authResult.auth;

    await prisma.notification.deleteMany({
      where: { userId },
    });

    return NextResponse.json({ success: true, message: "تم مسح جميع الإشعارات بنجاح" });
  } catch (error) {
    console.error("Clear All Error:", error);
    return jsonError("فشل في مسح الإشعارات", "SERVER_ERROR", 500);
  }
}
