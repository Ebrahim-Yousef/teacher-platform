import { NextResponse } from "next/server";
import { getSession, SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface AuthContextResult {
  session: SessionPayload;
  userId: string;
  role: string;
  teacherId: string | null;
}

export async function requireAuth(
  allowedRoles?: string[],
): Promise<{ auth: AuthContextResult } | { errorResponse: NextResponse }> {
  const session = await getSession();

  if (!session) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً" } },
        { status: 401 },
      ),
    };
  }

  const role = session.role.toUpperCase();

  if (allowedRoles && allowedRoles.length > 0) {
    const uppercaseAllowed = allowedRoles.map((r) => r.toUpperCase());
    if (!uppercaseAllowed.includes(role)) {
      return {
        errorResponse: NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "غير مصرح لك بالوصول" } },
          { status: 403 },
        ),
      };
    }
  }

  let teacherId: string | null = session.userId;
  if (role === "ASSISTANT") {
    const assistantUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { teacherId: true },
    });
    teacherId = assistantUser?.teacherId || null;
  } else if (role === "SUPER_ADMIN") {
    teacherId = null; // Super admin can see all or specify
  }

  return {
    auth: {
      session,
      userId: session.userId,
      role,
      teacherId,
    },
  };
}

export function jsonSuccess<T>(data: T, metaOrStatus?: unknown, maybeStatus = 200) {
  if (typeof metaOrStatus === "number") {
    return NextResponse.json({ success: true, data }, { status: metaOrStatus });
  }
  if (metaOrStatus && typeof metaOrStatus === "object") {
    return NextResponse.json({ success: true, data, meta: metaOrStatus }, { status: maybeStatus });
  }
  return NextResponse.json({ success: true, data }, { status: 200 });
}

export function jsonError(message: string, code = "SERVER_ERROR", status = 400) {
  return NextResponse.json(
    { success: false, error: { code, message }, message },
    { status },
  );
}
