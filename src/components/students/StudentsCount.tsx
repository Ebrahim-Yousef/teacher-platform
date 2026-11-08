"use client";

import React from "react";
import { useStudents } from "@/hooks/useStudents";

export interface StudentsCountProps {
  totalStudents?: number;
}

export const StudentsCount: React.FC<StudentsCountProps> = ({
  totalStudents: propCount,
}) => {
  const { totalStudents: contextCount } = useStudents();
  const count = propCount ?? contextCount;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-300">
      إجمالي الطلاب: <span className="text-indigo-400 font-bold">{count}</span>
    </div>
  );
};

export default StudentsCount;
