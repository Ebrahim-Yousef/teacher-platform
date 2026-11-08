"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Trash2, X } from "lucide-react";
import Spinner from "./ui/Spinner";
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
  NotificationItem,
} from "@/api/notifications";

export const NotificationBell: React.FC = () => {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getUnreadCount()
      .then((res) => {
        if (isMounted && typeof res?.count === "number") {
          setCount(res.count);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // إغلاق النافذة عند الضغط في أي مكان خارجي
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const loadItems = async () => {
    setLoadingList(true);
    try {
      const res = await listNotifications();
      const list = Array.isArray(res.data) ? res.data : [];
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoadingList(false);
    }
  };

  const toggleOpen = async () => {
    const nextState = !open;
    setOpen(nextState);
    if (nextState) {
      await loadItems();
    }
  };

  const handleOpenItem = async (item: NotificationItem) => {
    if (!item.isRead) {
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
      );
      setCount((c) => Math.max(0, c - 1));
      try {
        await markNotificationRead(item.id);
      } catch {
        // Best-effort
      }
    }
    setOpen(false);
    const target = (item as unknown as { targetUrl?: string }).targetUrl;
    if (target) {
      router.push(target);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    const removed = items.find((n) => n.id === id);
    if (removed && !removed.isRead) {
      setCount((c) => Math.max(0, c - 1));
    }
    setItems((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotification(id);
    } catch {
      // Best-effort
    }
  };

  const handleMarkAllRead = async () => {
    setBusy(true);
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setCount(0);
    } catch {
      // Best-effort
    } finally {
      setBusy(false);
    }
  };

  const handleClearAll = async () => {
    setBusy(true);
    try {
      await clearAllNotifications();
      setItems([]);
      setCount(0);
    } catch {
      // Best-effort
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        title="الإشعارات"
        aria-label="الإشعارات"
      >
        <Bell size={20} />
        {count > 0 && (
          <span className="absolute -top-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl text-right dir-rtl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-900/80">
            <p className="text-sm font-bold text-slate-100">الإشعارات</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={busy || items.length === 0}
                onClick={handleMarkAllRead}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40 cursor-pointer"
                title="قراءة الكل"
              >
                <CheckCheck size={16} />
              </button>
              <button
                type="button"
                disabled={busy || items.length === 0}
                onClick={handleClearAll}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40 cursor-pointer"
                title="مسح الكل"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 cursor-pointer"
                title="إغلاق"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loadingList ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
                <Spinner size={20} />
                جاري التحميل...
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-400">
                لا توجد إشعارات حالياً
              </p>
            ) : (
              <ul className="divide-y divide-slate-800/60">
                {items.map((item) => {
                  const bodyText = (item as unknown as { body?: string }).body || item.message;
                  return (
                    <li key={String(item.id)}>
                      <button
                        type="button"
                        onClick={() => handleOpenItem(item)}
                        className={`flex w-full cursor-pointer items-start gap-2.5 px-4 py-3 text-right transition-colors hover:bg-slate-800/60 ${
                          item.isRead ? "bg-slate-900" : "bg-indigo-500/5"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {!item.isRead && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                            )}
                            <p className="truncate text-sm font-bold text-slate-200">
                              {item.title || "إشعار جديد"}
                            </p>
                          </div>
                          {bodyText && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-400 leading-relaxed">
                              {bodyText}
                            </p>
                          )}
                          <p className="mt-1 text-[11px] text-slate-500">
                            {typeof item.createdAt === "string" ? item.createdAt.split("T")[0] : ""}
                          </p>
                        </div>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => handleDelete(e, item.id)}
                          className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 size={14} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
