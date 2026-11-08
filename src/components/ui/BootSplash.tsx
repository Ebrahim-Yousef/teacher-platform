import React from "react";
import Spinner from "./Spinner";

export interface BootSplashProps {
  /**
   * الرسالة التوضيحية الظاهرة أسفل أيقونة التحميل
   * @default "جاري التحقق من الجلسة..."
   */
  message?: string;
  /**
   * فئة تنسيق إضافية لتخصيص الحاوية الخارجية عند الحاجة
   */
  className?: string;
}

export const BootSplash: React.FC<BootSplashProps> = ({
  message = "جاري التحقق من الجلسة...",
  className = "",
}) => {
  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-indigo-400 p-4 dir-rtl animate-in fade-in duration-300 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="relative flex items-center justify-center">
        {/* هالة إضاءة خلفية ناعمة تحسن المظهر البصري */}
        <div className="absolute h-12 w-12 rounded-full bg-indigo-500/20 blur-xl animate-pulse" />
        <Spinner size={36} className="relative z-10 text-indigo-500" />
      </div>

      <p className="text-sm font-semibold tracking-wide text-slate-300 select-none">
        {message}
      </p>
    </div>
  );
};

export default BootSplash;
