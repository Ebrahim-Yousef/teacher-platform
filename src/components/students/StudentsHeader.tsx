"use client";

import React from "react";
import { Search, RotateCcw, UserPlus } from "lucide-react";
import Input from "../ui/Input";
import Select, { SelectOption } from "../ui/Select";
import Button from "../ui/Button";

export interface StudentsHeaderProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedStage: string;
  setSelectedStage: (value: string) => void;
  selectedGrade: string;
  setSelectedGrade: (value: string) => void;
  stagesOptions: SelectOption[];
  gradesOptions: SelectOption[];
  onClearFilters: () => void;
  onAddStudent: () => void;
}

export const StudentsHeader: React.FC<StudentsHeaderProps> = ({
  searchTerm,
  setSearchTerm,
  selectedStage,
  setSelectedStage,
  selectedGrade,
  setSelectedGrade,
  stagesOptions,
  gradesOptions,
  onClearFilters,
  onAddStudent,
}) => {
  const hasActiveFilters = Boolean(
    searchTerm || selectedStage || selectedGrade,
  );

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-end justify-between gap-3 sm:gap-4 bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl dir-rtl">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 flex-1">
        <div className="flex-1 min-w-50">
          <Input
            type="text"
            placeholder="ابحث باسم الطالب..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm("")}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            name="stage"
            value={selectedStage}
            onChange={(e) => setSelectedStage(String(e.target.value))}
            options={stagesOptions}
            placeholder="المرحلة الدراسية"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            name="grade"
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(String(e.target.value))}
            options={gradesOptions}
            disabled={!selectedStage}
            placeholder="الصف الدراسي"
          />
        </div>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            onClick={onClearFilters}
            className="h-11 px-3 text-slate-400 hover:text-slate-100 hover:bg-slate-800 flex items-center justify-center shrink-0 self-end"
            title="إعادة ضبط الفلاتر"
          >
            <RotateCcw size={18} />
            <span className="sm:hidden lg:inline text-xs font-medium mr-1.5">
              إعادة ضبط
            </span>
          </Button>
        )}
      </div>
      <div className="shrink-0 pt-3 lg:pt-0 border-t border-slate-800 lg:border-t-0">
        <Button
          onClick={onAddStudent}
          variant="primary"
          size="md"
          className="w-full sm:w-auto h-11 gap-2"
        >
          <UserPlus size={18} />
          <span>إضافة طالب جديد</span>
        </Button>
      </div>
    </div>
  );
};

export default StudentsHeader;
