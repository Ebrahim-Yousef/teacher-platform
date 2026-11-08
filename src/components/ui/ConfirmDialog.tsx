"use client";

import React from "react";
import Button from "./Button";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "تأكيد الإجراء",
  message = "هل أنت متأكد؟",
  confirmText = "حذف",
  cancelText = "إلغاء",
  variant = "danger",
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={loading ? undefined : onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-slate-900 p-6 shadow-2xl border border-slate-800 space-y-4 text-right dir-rtl animate-in zoom-in-95 duration-200"
      >
        <h3 className="text-lg font-bold text-slate-100">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "danger" : "primary"}
            size="md"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
