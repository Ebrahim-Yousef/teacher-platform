"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import {
  TOKEN_KEY,
  USER_KEY,
  SUBSCRIPTION_LOCK_KEY,
  LEGACY_KEYS,
  getHomePath,
  SUBSCRIPTION_LOCKABLE_ROLES,
} from "@/constants/app";
import { AuthContext, User } from "./AuthContext";

function clearLegacyStorage() {
  if (typeof window === "undefined") return;
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState<boolean>(true);

  // القراءة الفورية من localStorage لحظر القفل أو إظهاره من الإطار الأول
  const [subscriptionLocked, setSubscriptionLocked] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SUBSCRIPTION_LOCK_KEY) === "true";
  });

  const updateSubscriptionLockState = useCallback((isLocked: boolean) => {
    setSubscriptionLocked(isLocked);
    if (typeof window !== "undefined") {
      if (isLocked) {
        localStorage.setItem(SUBSCRIPTION_LOCK_KEY, "true");
      } else {
        localStorage.removeItem(SUBSCRIPTION_LOCK_KEY);
      }
    }
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SUBSCRIPTION_LOCK_KEY);
    clearLegacyStorage();
    setToken(null);
    setUser(null);
    setSubscriptionLocked(false);
  }, []);

  const clearSubscriptionLocked = useCallback(() => {
    updateSubscriptionLockState(false);
  }, [updateSubscriptionLockState]);

  const lockSubscription = useCallback(() => {
    updateSubscriptionLockState(true);
  }, [updateSubscriptionLockState]);

  const checkUserSubscriptionLock = useCallback(
    (userData: User | null) => {
      if (!userData) {
        updateSubscriptionLockState(false);
        return;
      }

      const role = (userData.role || "").toUpperCase();
      const canLock = SUBSCRIPTION_LOCKABLE_ROLES.includes(role);

      if (!canLock) {
        updateSubscriptionLockState(false);
        return;
      }

      const uRecord = userData as Record<string, unknown>;

      const status = String(
        uRecord.subscriptionStatus || uRecord.status || "",
      ).toUpperCase();

      if (status === "ACTIVE" || status === "VALID" || status === "PAID") {
        updateSubscriptionLockState(false);
        return;
      }

      const isInactive =
        status === "EXPIRED" || status === "UNPAID" || status === "INACTIVE";

      const subObj = (uRecord.subscription || uRecord.platformSubscription) as
        | Record<string, unknown>
        | undefined;
      let isSubObjExpired = false;

      if (subObj) {
        const subStatus = String(subObj.status || "").toUpperCase();
        if (subStatus === "ACTIVE" || subStatus === "VALID") {
          updateSubscriptionLockState(false);
          return;
        }
        if (
          subStatus === "EXPIRED" ||
          subStatus === "UNPAID" ||
          subStatus === "INACTIVE"
        ) {
          isSubObjExpired = true;
        }
        if (subObj.expiresAt) {
          const expDate = new Date(subObj.expiresAt as string);
          if (!isNaN(expDate.getTime()) && expDate < new Date()) {
            isSubObjExpired = true;
          }
        }
      }

      let isDateExpired = false;
      if (uRecord.subscriptionExpiresAt) {
        const expiryDate = new Date(uRecord.subscriptionExpiresAt as string);
        if (!isNaN(expiryDate.getTime()) && expiryDate < new Date()) {
          isDateExpired = true;
        }
      }

      if (isInactive || isSubObjExpired || isDateExpired) {
        updateSubscriptionLockState(true);
      } else {
        updateSubscriptionLockState(false);
      }
    },
    [updateSubscriptionLockState],
  );

  const persistSession = useCallback(
    (nextToken: string, nextUser: User) => {
      localStorage.setItem(TOKEN_KEY, nextToken);
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      clearLegacyStorage();
      setToken(nextToken);
      setUser(nextUser);

      checkUserSubscriptionLock(nextUser);
    },
    [checkUserSubscriptionLock],
  );

  useEffect(() => {
    clearLegacyStorage();
    let cancelled = false;

    const checkAuth = async () => {
      const bootToken = localStorage.getItem(TOKEN_KEY);
      const rawUser = localStorage.getItem(USER_KEY);

      if (!bootToken) {
        if (!cancelled) {
          clearSession();
          setIsBooting(false);
        }
        return;
      }

      if (rawUser) {
        try {
          const parsedUser = JSON.parse(rawUser);
          setUser(parsedUser);
          setToken(bootToken);
          checkUserSubscriptionLock(parsedUser);
        } catch {
          // تجاهل أخطاء التنسيق
        }
      }

      try {
        const json = await api<{ data: User }>("/auth/me", {
          token: bootToken,
        });
        if (cancelled) return;
        const nextUser = json.data;
        localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        setUser(nextUser);
        setToken(bootToken);
        checkUserSubscriptionLock(nextUser);
      } catch {
        if (cancelled) return;
        clearSession();
      } finally {
        if (!cancelled) {
          setIsBooting(false);
        }
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [clearSession, checkUserSubscriptionLock]);

  const login = useCallback(
    async (username: string, password: string) => {
      const json = await api<{
        data: { accessToken: string; user: User };
      }>("/auth/login", {
        method: "POST",
        body: { username, password },
      });
      const { accessToken, user: nextUser } = json.data;

      persistSession(accessToken, nextUser);

      try {
        const meRes = await api<{ data: User }>("/auth/me", {
          token: accessToken,
        });
        if (meRes && meRes.data) {
          persistSession(accessToken, meRes.data);
        }
      } catch {
        // في حال تعذر جلب me يتم الاكتفاء بالـ login
      }

      return nextUser;
    },
    [persistSession],
  );

  const logout = useCallback(async () => {
    const currentToken = token;
    clearSession();
    if (currentToken) {
      try {
        await api("/auth/logout", {
          method: "POST",
          token: currentToken,
        });
      } catch {
        // Best-effort
      }
    }
  }, [token, clearSession]);

  const role = user?.role ?? undefined;
  const normalizedRole = role ? role.toUpperCase() : "";
  const homePath = getHomePath(role);

  const isTeacher = normalizedRole === "TEACHER";
  const isAssistant = normalizedRole === "ASSISTANT";

  const canSubscriptionLock = SUBSCRIPTION_LOCKABLE_ROLES.some(
    (r) => r.toUpperCase() === normalizedRole,
  );

  const hasRole = useCallback(
    (...roles: string[]) => {
      if (!role) return false;
      if (!roles.length) return true;
      const normalizedRoles = roles.map((r) => r.toUpperCase());
      return normalizedRoles.includes(normalizedRole);
    },
    [role, normalizedRole],
  );

  const value = useMemo(
    () => ({
      user,
      token,
      role,
      homePath,
      isBooting,
      isTeacher,
      isAssistant,
      hasRole,
      subscriptionLocked: canSubscriptionLock && subscriptionLocked,
      lockSubscription,
      clearSubscriptionLocked,
      login,
      logout,
      clearSession,
    }),
    [
      user,
      token,
      role,
      homePath,
      isBooting,
      isTeacher,
      isAssistant,
      hasRole,
      canSubscriptionLock,
      subscriptionLocked,
      lockSubscription,
      clearSubscriptionLocked,
      login,
      logout,
      clearSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
