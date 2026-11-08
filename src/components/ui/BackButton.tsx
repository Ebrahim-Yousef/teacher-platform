"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/cn";

export interface BackButtonProps {
  to?: string;
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({ to, className }) => {
  const router = useRouter();

  const handleClick = () => {
    if (to) {
      router.push(to);
    } else {
      router.back();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 text-slate-300 transition-all duration-200 hover:border-slate-700 hover:bg-slate-800 hover:text-white active:scale-95 cursor-pointer shadow-sm",
        className,
      )}
      title="العودة"
    >
      <ArrowRight size={18} />
    </button>
  );
};

export default BackButton;
