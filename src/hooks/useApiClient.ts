import { useCallback } from "react";
import { api, ApiError } from "@/api/client";
import { isSubscriptionForbidden } from "@/api/errors";
import { SUBSCRIPTION_LOCKABLE_ROLES } from "@/constants/app";
import { useAuth } from "./useAuth";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions extends Omit<RequestInit, "body" | "method"> {
  method?: HttpMethod;
  skipAuth?: boolean;
  body?: unknown;
  token?: string;
}

export function useApiClient() {
  const { token, clearSession, lockSubscription, role } = useAuth();

  return useCallback(
    async <T = unknown>(
      path: string,
      options: RequestOptions = {},
    ): Promise<T> => {
      const { skipAuth = false, ...rest } = options;
      const authToken = skipAuth ? undefined : token || undefined;

      try {
        return await api<T>(path, { ...rest, token: authToken });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401 && !skipAuth) {
          clearSession?.();
        } else if (
          isSubscriptionForbidden(error) &&
          SUBSCRIPTION_LOCKABLE_ROLES.includes(role || "")
        ) {
          lockSubscription?.();
        }
        throw error;
      }
    },
    [token, clearSession, lockSubscription, role],
  );
}
