import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";
import bcrypt from "bcryptjs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const existing = await prisma.user.findFirst({
      where: {
        id,
        role: "ASSISTANT",
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
    });

    if (!existing) {
      return jsonError("المساعد غير موجود", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const { name, password, username } = body;

    let hashedPassword = undefined;
    if (password && String(password).trim().length > 0) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(username !== undefined ? { username: username.trim().toLowerCase() } : {}),
        ...(hashedPassword ? { password: hashedPassword } : {}),
      },
      select: {
        id: true,
        name: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return jsonSuccess({
      id: updated.id,
      name: updated.name,
      username: updated.username || "",
      isActive: true,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Update Assistant Error:", error);
    return jsonError("فشل في تحديث بيانات المساعد", "SERVER_ERROR", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const existing = await prisma.user.findFirst({
      where: {
        id,
        role: "ASSISTANT",
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
    });

    if (!existing) {
      return jsonError("المساعد غير موجود", "NOT_FOUND", 404);
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "تم حذف المساعد بنجاح" });
  } catch (error) {
    console.error("Delete Assistant Error:", error);
    return jsonError("فشل في حذف المساعد", "SERVER_ERROR", 500);
  }
}
