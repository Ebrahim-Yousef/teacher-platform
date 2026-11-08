import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "edtech_platform_super_secret_jwt_key_2026_x90",
);

export interface SessionPayload {
  userId: string;
  role: string;
  email: string;
}

// 1. إنشاء الـ Token
export async function createSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

// 2. التحقق من صحة الـ Token
export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// 3. حفظ الـ Token داخل Cookie آمنة
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 أيام
  });
}

// 4. قراءة الجلسة الحالية
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

// 5. تسجيل الخروج
export async function removeSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("session_token");
}
