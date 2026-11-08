import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { userId } = authResult.auth;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const notifications = await prisma.notification.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const formatted = notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.message,
      message: n.message,
      type: n.type || "SYSTEM",
      targetUrl: n.targetUrl,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    }));

    return jsonSuccess(formatted);
  } catch (error) {
    console.error("List Notifications Error:", error);
    return jsonError("فشل في جلب الإشعارات", "SERVER_ERROR", 500);
  }
}
