import { NextRequest } from "next/server";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/serverAuth";
import { getWhatsAppLink } from "@/utils/whatsapp";

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(["TEACHER", "ASSISTANT", "SUPER_ADMIN"]);
    if ("errorResponse" in authResult) return authResult.errorResponse;

    const body = await request.json();
    const { phone, template } = body;

    if (!phone) {
      return jsonError("رقم الهاتف مطلوب", "BAD_REQUEST", 400);
    }

    const url = getWhatsAppLink(phone, template);

    return jsonSuccess({ url });
  } catch (error) {
    console.error("WhatsApp Link Error:", error);
    return jsonError("فشل في إنشاء رابط واتساب", "SERVER_ERROR", 500);
  }
}
