"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApiClient } from "./useApiClient";

const SLOW_MS = 8000;

export interface UseFetchOptions {
  enabled?: boolean;
}

export interface UseFetchResult<TData = unknown, TMeta = unknown> {
  data: TData | null;
  meta: TMeta | null;
  isLoading: boolean;
  isSlow: boolean;
  error: unknown;
  refetch: () => void;
}

export function useFetch<TData = unknown, TMeta = unknown>(
  path: string | null,
  { enabled = true }: UseFetchOptions = {},
): UseFetchResult<TData, TMeta> {
  const request = useApiClient();
  const [data, setData] = useState<TData | null>(null);
  const [meta, setMeta] = useState<TMeta | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSlow, setIsSlow] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);
  const [tick, setTick] = useState<number>(0);
  const abortRef = useRef<number>(0);

  const refetch = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    // إذا كان الشرط غير متحقق، لا ننفذ أي شيء
    if (!enabled || !path) {
      return undefined;
    }

    const requestId = ++abortRef.current;
    let cancelled = false;

    const slowTimer = window.setTimeout(() => {
      if (!cancelled && abortRef.current === requestId) {
        setIsSlow(true);
      }
    }, SLOW_MS);

    const fetchData = async () => {
      setIsLoading(true);
      setIsSlow(false);
      setError(null);
      try {
        const json = await request<{ data?: TData; meta?: TMeta }>(path);
        if (cancelled || abortRef.current !== requestId) return;
        setData(json.data ?? null);
        setMeta(json.meta ?? null);
        setError(null);
      } catch (err: unknown) {
        if (cancelled || abortRef.current !== requestId) return;
        setError(err);
      } finally {
        window.clearTimeout(slowTimer);
        if (!cancelled && abortRef.current === requestId) {
          setIsLoading(false);
          setIsSlow(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
    };
  }, [path, enabled, request, tick]);

  // حساب حالة التحميل الفعلية بناءً على الشروط بدون الحاجة لاستدعاء setState بشكل متزامن
  const shouldFetch = Boolean(enabled && path);
  const effectiveIsLoading = shouldFetch ? isLoading : false;

  return {
    data,
    meta,
    isLoading: effectiveIsLoading,
    isSlow: shouldFetch ? isSlow : false,
    error,
    refetch,
  };
}
