import { api } from "./client";

export interface WhatsAppTemplateResponse {
  data?: {
    template?: string;
  };
  template?: string;
}

export interface ActiveSubjectsResponse {
  data?: {
    subjects?: Array<{ id: number; name: string; isActive?: boolean }>;
    activeSubjectIds?: (number | string)[];
  };
  subjectIds?: (number | string)[];
}

export function getWhatsAppTemplate() {
  return api<WhatsAppTemplateResponse>("/settings/whatsapp-template");
}

export function saveWhatsAppTemplate(template: string) {
  return api<{ message: string; data?: { template?: string } }>(
    "/settings/whatsapp-template",
    {
      method: "PUT",
      body: { template },
    },
  );
}

export function getActiveSubjects() {
  return api<ActiveSubjectsResponse>("/settings/active-subjects");
}

export function saveActiveSubjects(subjectIds: (number | string)[]) {
  return api<{ message: string }>("/settings/active-subjects", {
    method: "PUT",
    body: { subjectIds },
  });
}
