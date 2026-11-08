import { api } from "./client";

export interface AssistantItem {
  id: number | string;
  name: string;
  username: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function listAssistants() {
  return api<{ data: AssistantItem[] }>("/assistants");
}

export function createAssistant(body: Record<string, unknown>) {
  return api<{ data: AssistantItem }>("/assistants", {
    method: "POST",
    body,
  });
}

export function updateAssistant(
  id: number | string,
  body: Record<string, unknown>,
) {
  return api<{ data: AssistantItem }>(`/assistants/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteAssistant(id: number | string) {
  return api<{ message: string }>(`/assistants/${id}`, { method: "DELETE" });
}
