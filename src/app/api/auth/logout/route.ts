import { NextResponse } from "next/server";
import { removeSessionCookie } from "@/lib/auth";

export async function POST() {
  try {
    await removeSessionCookie();
    return NextResponse.json({ message: "تم تسجيل الخروج بنجاح" });
  } catch (error) {
    console.error("Logout Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تسجيل الخروج" },
      { status: 500 },
    );
  }
}
