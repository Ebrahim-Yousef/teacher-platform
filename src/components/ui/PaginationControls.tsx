"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  totalItems?: number;
  pageSizes?: number[];
}

function getVisiblePages(
  currentPage: number,
  totalPages: number,
  windowSize = 5,
) {
  if (totalPages <= windowSize + 2) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set([1, totalPages, currentPage]);
  const half = Math.floor(windowSize / 2);

  for (let i = currentPage - half; i <= currentPage + half; i += 1) {
    if (i > 1 && i < totalPages) pages.add(i);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | string)[] = [];

  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) {
      result.push("ellipsis-" + sorted[index - 1]);
    }
    result.push(page);
  });

  return result;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalItems,
  pageSizes = [10, 20, 50, 100],
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!totalItems || totalItems === 0) return null;

  const pages = getVisiblePages(currentPage, totalPages);

  return (
    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800 pt-4 dir-rtl">
      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 text-slate-300 bg-slate-900 transition-all hover:bg-slate-800 hover:border-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            title="الصفحة السابقة"
          >
            <ChevronRight size={18} />
          </button>

          {pages.map((page) =>
            typeof page === "string" ? (
              <span
                key={page}
                className="h-9 min-w-9 px-1 text-center text-sm font-bold text-slate-500"
              >
                …
              </span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={`h-9 min-w-9 rounded-xl border px-3 text-sm font-semibold transition-all cursor-pointer ${
                  currentPage === page
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20"
                    : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:border-slate-700"
                }`}
              >
                {page}
              </button>
            ),
          )}

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 text-slate-300 bg-slate-900 transition-all hover:bg-slate-800 hover:border-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            title="الصفحة التالية"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      ) : (
        <div />
      )}

      {onPageSizeChange && pageSize && (
        <div className="relative inline-block text-right">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-bold text-indigo-400 transition-all hover:bg-slate-800 hover:border-slate-700 focus:outline-none"
          >
            <span>{pageSize} لكل صفحة</span>
            <ChevronDown
              size={14}
              className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-24 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl z-50 py-1">
              {pageSizes.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    onPageSizeChange(num);
                    setIsOpen(false);
                  }}
                  className={`w-full text-center px-2 py-1.5 text-xs font-bold transition-colors ${
                    pageSize === num
                      ? "bg-indigo-600/20 text-indigo-400"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaginationControls;
