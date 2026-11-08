import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

// GET: جلب قائمة الاشتراكات (خاص بالـ Super Admin فقط)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(["SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status")?.trim();

    const subscriptions = await prisma.subscription.findMany({
      where: {
        ...(status ? { status: status as "ACTIVE" | "UNPAID" | "EXPIRED" } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = subscriptions.map((s) => ({
      id: s.id,
      status: s.status,
      expiresAt: s.expiresAt ? s.expiresAt.toISOString() : null,
      notes: s.notes,
      teacher: {
        id: s.user.id,
        name: s.user.name,
        username: s.user.username || "",
      },
      teacherName: s.user.name,
      ownerName: s.user.name,
      username: s.user.username || "",
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return jsonSuccess(formatted);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف";
    console.error("List Admin Subscriptions Error:", errorMessage);
    return jsonError(errorMessage, "SERVER_ERROR", 500);
  }
}
