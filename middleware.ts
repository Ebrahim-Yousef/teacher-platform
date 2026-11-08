import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "edtech_platform_super_secret_jwt_key_2026_x90",
);

// الأدوار المسموح بها لكل بادئة مسار
const roleProtectedRoutes: Record<string, string[]> = {
  "/admin": ["SUPER_ADMIN"],
  "/api/admin": ["SUPER_ADMIN"],
  "/teacher": ["SUPER_ADMIN", "TEACHER"],
  "/assistant": ["SUPER_ADMIN", "TEACHER", "ASSISTANT"],
  "/student": ["SUPER_ADMIN", "STUDENT"],
};

const roleDefaultPages: Record<string, string> = {
  SUPER_ADMIN: "/admin",
  TEACHER: "/teacher/dashboard",
  ASSISTANT: "/teacher",
  STUDENT: "/student",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("session_token")?.value;

  // 1. استثناء الملفات الثابتة ومسار تسجيل الدخول المحلي المباشر
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/api/auth/login"
  ) {
    return NextResponse.next();
  }

  // 2. إذا لم يتوفر التوكين
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
    }
    if (pathname === "/login" || pathname === "/unauthorized") return NextResponse.next();
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. فك تشفير وتمرير الهوية في الـ Request Headers
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = (payload.sub as string) || (payload.id as string) || (payload.userId as string) || "";
    const userRole = (payload.role as string) || "STUDENT";

    // إعادة توجيه المسجلين من صفحة الدخول أو /
    if (pathname === "/" || pathname === "/login") {
      const targetPage = roleDefaultPages[userRole] || "/login";
      return NextResponse.redirect(new URL(targetPage, request.url));
    }

    // التحقق من صلاحيات الأدوار
    for (const [prefix, roles] of Object.entries(roleProtectedRoutes)) {
      if (pathname.startsWith(prefix) && !roles.includes(userRole)) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "غير مصرح لك بالوصول" } },
            { status: 403 },
          );
        }
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }

    // تمرير بيانات المستخدم كـ Headers للـ App Router API Routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", userId);
    requestHeaders.set("x-user-role", userRole);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "الجلسة انتهت، يرجى تسجيل الدخول" },
        { status: 401 },
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
