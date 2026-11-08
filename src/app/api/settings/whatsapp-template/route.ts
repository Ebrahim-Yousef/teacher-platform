import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";
import { DEFAULT_WHATSAPP_TEMPLATE } from "@/constants/app";

export async function GET() {
  try {
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { teacherId } = authResult.auth;

    if (!teacherId) {
      return jsonSuccess({ template: DEFAULT_WHATSAPP_TEMPLATE });
    }

    const settings = await prisma.teacherSettings.findUnique({
      where: { teacherId },
    });

    const template = settings?.whatsappTemplate || DEFAULT_WHATSAPP_TEMPLATE;

    return jsonSuccess({ template });
  } catch (error) {
    console.error("Get WhatsApp Template Error:", error);
    return jsonError("فشل في جلب قالب واتساب", "SERVER_ERROR", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(["TEACHER", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;
    const { teacherId, userId } = authResult.auth;

    const effectiveTeacherId = teacherId || userId;
    const body = await request.json();
    const template = String(body.template || "").trim();

    const settings = await prisma.teacherSettings.upsert({
      where: { teacherId: effectiveTeacherId },
      update: { whatsappTemplate: template },
      create: {
        teacherId: effectiveTeacherId,
        whatsappTemplate: template,
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم حفظ قالب واتساب بنجاح",
      data: { template: settings.whatsappTemplate },
    });
  } catch (error) {
    console.error("Save WhatsApp Template Error:", error);
    return jsonError("فشل في حفظ قالب واتساب", "SERVER_ERROR", 500);
  }
}
