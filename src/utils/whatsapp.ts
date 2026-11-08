import { DEFAULT_WHATSAPP_TEMPLATE } from "@/constants/app";

export const toWhatsAppPhone = (phone?: string | number | null): string => {
  if (!phone) return "";
  let cleanPhone = String(phone).replace(/\D/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "20" + cleanPhone.slice(1);
  }
  return cleanPhone;
};

export const getWhatsAppLink = (
  phone?: string | number | null,
  template = DEFAULT_WHATSAPP_TEMPLATE,
): string => {
  const cleanPhone = toWhatsAppPhone(phone);
  if (!cleanPhone) return "#";
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(template)}`;
};
