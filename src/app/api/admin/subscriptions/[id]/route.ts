import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH: تحديث اشتراك معلم محدد
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const authResult = await requireAuth(["SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;

    const { id } = await context.params;
    const body = await request.json();
    const { status, expiresAt, notes } = body;

    const existingSubscription = await prisma.subscription.findUnique({
      where: { id },
    });

    if (!existingSubscription) {
      return jsonError("الاشتراك غير موجود", "NOT_FOUND", 404);
    }

    const updatedSubscription = await prisma.subscription.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(expiresAt !== undefined
          ? { expiresAt: expiresAt ? new Date(expiresAt) : null }
          : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    const formatted = {
      id: updatedSubscription.id,
      status: updatedSubscription.status,
      expiresAt: updatedSubscription.expiresAt ? updatedSubscription.expiresAt.toISOString() : null,
      notes: updatedSubscription.notes,
      teacher: {
        id: updatedSubscription.user.id,
        name: updatedSubscription.user.name,
        username: updatedSubscription.user.username || "",
      },
      teacherName: updatedSubscription.user.name,
      ownerName: updatedSubscription.user.name,
      username: updatedSubscription.user.username || "",
      createdAt: updatedSubscription.createdAt.toISOString(),
      updatedAt: updatedSubscription.updatedAt.toISOString(),
    };

    return jsonSuccess(formatted);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف";
    console.error("Update Admin Subscription Error:", errorMessage);
    return jsonError(errorMessage, "SERVER_ERROR", 500);
  }
}
