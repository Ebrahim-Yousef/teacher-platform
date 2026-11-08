"use client";

import React from "react";
import { AlertTriangle, Inbox, RefreshCw, LucideIcon } from "lucide-react";
import Button from "./Button";
import Spinner from "./Spinner";

// 1. تنبيه بدء الخادم (Cold Start Notice)
export const ColdStartNotice: React.FC = () => (
  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
    الخادم يستيقظ من وضع السكون، قد تستغرق أول عملية حتى دقيقة…
  </div>
);

// 2. مكون التحميل (LoadingBlock)
export interface LoadingBlockProps {
  label?: string;
  isSlow?: boolean;
}

export const LoadingBlock: React.FC<LoadingBlockProps> = ({
  label = "جاري التحميل...",
  isSlow = false,
}) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-6 py-16 shadow-xs">
    <Spinner size={28} />
    <p className="text-sm font-semibold text-slate-600">{label}</p>
    {isSlow && (
      <div className="w-full max-w-md mt-2">
        <ColdStartNotice />
      </div>
    )}
  </div>
);

// 3. مكون البيانات الفارغة (EmptyBlock)
export interface EmptyBlockProps {
  icon?: LucideIcon;
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyBlock: React.FC<EmptyBlockProps> = ({
  icon: Icon = Inbox,
  title = "لا توجد بيانات",
  description,
  action,
}) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-xs">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
      <Icon size={28} />
    </div>
    <div className="space-y-1">
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      {description && (
        <p className="text-sm font-medium text-slate-500">{description}</p>
      )}
    </div>
    {action && <div className="mt-2">{action}</div>}
  </div>
);

// 4. مكون الخطأ (ErrorBlock)
export interface ErrorBlockProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorBlock: React.FC<ErrorBlockProps> = ({
  message = "حدث خطأ أثناء تحميل البيانات",
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-100 bg-red-50/50 px-6 py-16 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-500">
      <AlertTriangle size={28} />
    </div>
    <p className="text-sm font-semibold text-red-700">{message}</p>
    {onRetry && (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="mt-2"
      >
        <RefreshCw size={16} className="ml-2" />
        إعادة المحاولة
      </Button>
    )}
  </div>
);

// 5. صفوف الهيكل العظمي للتحميل (SkeletonRows)
export interface SkeletonRowsProps {
  rows?: number;
  cols?: number;
}

export const SkeletonRows: React.FC<SkeletonRowsProps> = ({
  rows = 5,
  cols = 4,
}) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
    <div className="space-y-0 divide-y divide-slate-100">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="grid gap-4 px-4 py-4 sm:px-6"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }, (_, j) => (
            <div
              key={j}
              className="h-4 animate-pulse rounded-lg bg-slate-100"
            />
          ))}
        </div>
      ))}
    </div>
  </div>
);
