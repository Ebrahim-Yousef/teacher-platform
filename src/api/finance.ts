import { api, buildQuery } from "./client";

export interface FinanceSummary {
  expected?: number;
  collected?: number;
  remaining?: number;
  byBillingWindow?: Record<string, number>;
}

export interface FinanceSubscriptionItem {
  id?: string | number;
  studentId: string | number;
  studentName?: string;
  student?: { name?: string };
  monthlyFeeId?: string | number;
  effectiveMonthlyFee?: number;
  effectiveAmountDue?: number;
  amountDue?: number;
  amountPaid?: number;
  remaining?: number;
  status: string;
  billingWindowStatus: string;
  paidWithinFirstFiveDays?: boolean;
  isOverdue?: boolean;
  hasCustomPrice?: boolean;
  monthlyFeeOverride?: number | string | null;
  groupDefaultMonthlyFee?: number;
  month?: string;
}

export interface FinanceFeeItem {
  id: string | number;
  studentId: string | number;
  studentName?: string;
  student?: { name?: string };
  month: string;
  amountDue?: number;
  effectiveMonthlyFee?: number;
  effectiveAmountDue?: number;
  amountPaid?: number;
  remaining?: number;
  status: string;
  billingWindowStatus?: string;
  hasCustomPrice?: boolean;
  monthlyFeeOverride?: number | string | null;
  groupDefaultMonthlyFee?: number;
}

export function getFinanceSummary(params: Record<string, unknown> = {}) {
  return api<{ data: FinanceSummary }>(`/finance/summary${buildQuery(params)}`);
}

export function listSubscriptions(params: Record<string, unknown> = {}) {
  return api<{ data: FinanceSubscriptionItem[] }>(
    `/finance/subscriptions${buildQuery(params)}`,
  );
}

export function listFees(params: Record<string, unknown> = {}) {
  return api<{
    data: FinanceFeeItem[];
    meta?: { page: number; limit: number; total: number; totalPages: number };
  }>(`/finance/fees${buildQuery(params)}`);
}

export function createFee(body: Record<string, unknown>) {
  return api<{ data: FinanceFeeItem }>("/finance/fees", {
    method: "POST",
    body,
  });
}

export function updateFee(id: number | string, body: Record<string, unknown>) {
  return api<{ data: FinanceFeeItem }>(`/finance/fees/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteFee(id: number | string) {
  return api<{ message: string }>(`/finance/fees/${id}`, { method: "DELETE" });
}

export function listPayments(params: Record<string, unknown> = {}) {
  return api(`/finance/payments${buildQuery(params)}`);
}

export function createPayment(body: Record<string, unknown>) {
  return api("/finance/payments", { method: "POST", body });
}

export function deletePayment(id: number | string) {
  return api(`/finance/payments/${id}`, { method: "DELETE" });
}
