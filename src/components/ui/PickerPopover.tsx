"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LucideIcon, X } from "lucide-react";
import { cn } from "@/utils/cn";
import Label from "./Label";

export interface PickerPopoverProps {
  label?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  icon?: LucideIcon;
  displayValue?: string;
  placeholder?: string;
  clearable?: boolean;
  hasValue?: boolean;
  onClear?: () => void;
  children:
    | React.ReactNode
    | ((props: { close: () => void }) => React.ReactNode);
  panelClassName?: string;
  className?: string;
}

export const PickerPopover: React.FC<PickerPopoverProps> = ({
  label,
  name,
  required = false,
  disabled = false,
  error,
  icon: Icon,
  displayValue,
  placeholder = "اختر...",
  clearable = true,
  hasValue = false,
  onClear,
  children,
  panelClassName,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    minWidth: number;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerWrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerId = useId();

  const updatePosition = useCallback(() => {
    const el = triggerWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 8;
    const viewportPad = 8;
    const panelWidth = Math.max(rect.width, 240);

    let left = rect.right - panelWidth;
    left = Math.max(
      viewportPad,
      Math.min(left, window.innerWidth - panelWidth - viewportPad),
    );

    let top = rect.bottom + gap;
    const estimatedHeight = panelRef.current?.offsetHeight || 320;
    if (top + estimatedHeight > window.innerHeight - viewportPad) {
      const above = rect.top - gap - estimatedHeight;
      if (above >= viewportPad) {
        top = above;
      } else {
        top = Math.max(
          viewportPad,
          window.innerHeight - estimatedHeight - viewportPad,
        );
      }
    }

    setCoords({ top, left, width: panelWidth, minWidth: rect.width });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = () => {
      if (!cancelled) updatePosition();
    };

    const id = requestAnimationFrame(() => {
      run();
      requestAnimationFrame(run);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onReposition = () => updatePosition();

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updatePosition]);

  const close = () => setOpen(false);

  const panel =
    typeof document !== "undefined"
      ? createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={panelRef}
                role="dialog"
                dir="rtl"
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                style={{
                  position: "fixed",
                  top: coords?.top ?? 0,
                  left: coords?.left ?? 0,
                  width: coords?.width ?? "auto",
                  minWidth: coords?.minWidth ?? undefined,
                  zIndex: 100,
                  visibility: coords ? "visible" : "hidden",
                }}
                className={cn(
                  "overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-2xl text-slate-100",
                  panelClassName,
                )}
              >
                {typeof children === "function"
                  ? children({ close })
                  : children}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )
      : null;

  return (
    <div
      className={cn("relative w-full space-y-1.5 dir-rtl", className)}
      ref={rootRef}
    >
      {label && (
        <Label htmlFor={triggerId} required={required}>
          {label}
        </Label>
      )}

      <div className="relative" ref={triggerWrapRef}>
        {Icon && (
          <Icon
            size={18}
            className="pointer-events-none absolute right-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400"
          />
        )}

        <button
          id={triggerId}
          type="button"
          name={name}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => !disabled && setOpen((v) => !v)}
          className={cn(
            "flex w-full items-center rounded-xl border bg-slate-900/90 py-2.5 pr-10 text-right text-sm outline-none transition-all duration-200",
            clearable && hasValue && !disabled ? "pl-10" : "pl-4",
            error
              ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              : open
                ? "border-indigo-500 ring-2 ring-indigo-500/20"
                : "border-slate-800 hover:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
            disabled &&
              "cursor-not-allowed bg-slate-950 text-slate-500 opacity-60",
            !disabled && "cursor-pointer",
          )}
        >
          <span
            className={cn(
              "truncate font-medium",
              displayValue ? "text-slate-100" : "text-slate-500 font-normal",
            )}
          >
            {displayValue || placeholder}
          </span>
        </button>

        {clearable && hasValue && !disabled && (
          <button
            type="button"
            title="مسح"
            onClick={(e) => {
              e.stopPropagation();
              onClear?.();
              setOpen(false);
            }}
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-400 cursor-pointer"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {error && (
        <p className="mt-1 text-xs font-medium text-red-400">{error}</p>
      )}

      {panel}
    </div>
  );
};

export default PickerPopover;
