import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { role, teacherId } = authResult.auth;

    const assistants = await prisma.user.findMany({
      where: {
        role: "ASSISTANT",
        ...(role !== "SUPER_ADMIN" && teacherId ? { teacherId } : {}),
      },
      select: {
        id: true,
        name: true,
        username: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = assistants.map((a) => ({
      id: a.id,
      name: a.name,
      username: a.username || "",
      isActive: true,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));

    return jsonSuccess(formatted);
  } catch (error) {
    console.error("List Assistants Error:", error);
    return jsonError("فشل في جلب قائمة المساعدين", "SERVER_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { teacherId, userId } = authResult.auth;

    const body = await request.json();
    const { name, username, password } = body;

    if (!name || !username || !password) {
      return jsonError("الاسم واسم المستخدم وكلمة المرور حقول مطلوبة", "BAD_REQUEST", 400);
    }

    const cleanUsername = String(username).trim().toLowerCase();

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: cleanUsername }, { email: `${cleanUsername}@platform.local` }],
      },
    });

    if (existing) {
      return jsonError("اسم المستخدم مستخدم بالفعل", "CONFLICT", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const effectiveTeacherId = teacherId || userId;

    const assistant = await prisma.user.create({
      data: {
        name: name.trim(),
        username: cleanUsername,
        email: `${cleanUsername}@platform.local`,
        password: hashedPassword,
        role: "ASSISTANT",
        teacherId: effectiveTeacherId,
      },
      select: {
        id: true,
        name: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return jsonSuccess(
      {
        id: assistant.id,
        name: assistant.name,
        username: assistant.username || "",
        isActive: true,
        createdAt: assistant.createdAt.toISOString(),
        updatedAt: assistant.updatedAt.toISOString(),
      },
      201,
    );
  } catch (error) {
    console.error("Create Assistant Error:", error);
    return jsonError("فشل في إنشاء حساب المساعد", "SERVER_ERROR", 500);
  }
}
