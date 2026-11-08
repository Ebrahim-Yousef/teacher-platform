"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, SearchX, ChevronLeft, UserPlus } from "lucide-react";
import ConfirmDialog from "../ui/ConfirmDialog";
import Button from "../ui/Button";
import { ColdStartNotice, ErrorBlock, SkeletonRows } from "../ui/StateBlock";

export interface StudentItem {
  id: string;
  name: string;
  studentPhone?: string;
  parentPhone?: string;
  stage: string;
  grade: string;
}

export interface StudentsTableProps {
  students: StudentItem[];
  currentPage?: number;
  itemsPerPage?: number;
  isLoading?: boolean;
  isSlow?: boolean;
  error?: string | null;
  hasAnyStudents?: boolean;
  hasFilters?: boolean;
  onRetry?: () => void;
  onEditStudent: (student: StudentItem) => void;
  onDeleteStudent: (studentId: string) => Promise<void>;
  onAddStudent?: () => void;
}

export const StudentsTable: React.FC<StudentsTableProps> = ({
  students,
  currentPage = 1,
  itemsPerPage = 10,
  isLoading = false,
  isSlow = false,
  error = null,
  hasAnyStudents = true,
  hasFilters = false,
  onRetry,
  onEditStudent,
  onDeleteStudent,
  onAddStudent,
}) => {
  const router = useRouter();
  const [studentToDelete, setStudentToDelete] = useState<StudentItem | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const startIndex = (currentPage - 1) * itemsPerPage;

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteStudent(studentToDelete.id);
      setStudentToDelete(null);
    } catch {
      console.error("خطأ أثناء الحذف");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {isSlow && <ColdStartNotice />}
        <SkeletonRows rows={6} cols={5} />
      </div>
    );
  }

  if (error) {
    return <ErrorBlock message={error} onRetry={onRetry} />;
  }

  if (students.length === 0) {
    return (
      <div className="w-full rounded-2xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden dir-rtl">
        <div className="px-4 py-12 text-center">
          <div className="flex flex-col items-center justify-center gap-2.5 text-slate-400">
            <div className="p-3 bg-slate-800 rounded-2xl text-slate-400">
              <SearchX size={28} strokeWidth={1.5} />
            </div>
            <div className="max-w-xs space-y-1">
              <p className="text-sm font-semibold text-slate-200">
                {!hasAnyStudents
                  ? "لا يوجد طلاب مسجلون حتى الآن"
                  : "لا توجد نتائج مطابقة لبحثك"}
              </p>
              <p className="text-xs text-slate-400">
                {!hasAnyStudents
                  ? "قم بإضافة طالب جديد لبدء إدارة القائمة."
                  : "تأكد من صحة الاسم أو قم بتغيير الفلاتر."}
              </p>
            </div>
            {!hasAnyStudents && onAddStudent && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="mt-3"
                onClick={onAddStudent}
              >
                <UserPlus size={16} />
                إضافة طالب جديد
              </Button>
            )}
            {hasAnyStudents && hasFilters && (
              <p className="text-xs text-slate-500 mt-1">
                جرّب مسح البحث أو إعادة ضبط الفلاتر
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full rounded-2xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden dir-rtl">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right border-collapse table-fixed min-w-xl">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="w-12 px-3 py-3.5 text-center">م</th>
                <th className="w-[30%] px-3 py-3.5 align-middle">اسم الطالب</th>
                <th className="w-[18%] px-3 py-3.5 align-middle">رقم الطالب</th>
                <th className="w-[18%] px-3 py-3.5 align-middle">
                  رقم ولي الأمر
                </th>
                <th className="w-[12%] px-2 py-3.5 align-middle">المرحلة</th>
                <th className="w-[12%] px-2 py-3.5 align-middle">الصف</th>
                <th className="w-24 px-2 py-3.5 text-center align-middle whitespace-nowrap">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
              {students.map((student, index) => {
                const studentNumber = startIndex + index + 1;
                return (
                  <tr
                    key={student.id}
                    onClick={() =>
                      router.push(`/teacher/students/${student.id}`)
                    }
                    className="group cursor-pointer transition-colors duration-150 hover:bg-slate-800/60"
                  >
                    <td className="align-middle text-center">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-xs font-semibold font-mono text-slate-400 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 transition-colors">
                        {studentNumber}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span
                        className="font-semibold text-slate-100 truncate block"
                        title={student.name}
                      >
                        {student.name}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle font-mono text-xs text-slate-400 truncate">
                      <span dir="ltr" className="inline-block truncate">
                        {student.studentPhone || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle font-mono text-xs text-slate-400 truncate">
                      <span dir="ltr" className="inline-block truncate">
                        {student.parentPhone || "—"}
                      </span>
                    </td>
                    <td className="px-2 py-3 align-middle whitespace-nowrap">
                      <span className="inline-flex items-center text-xs font-medium text-slate-300">
                        {student.stage}
                      </span>
                    </td>
                    <td className="px-2 py-3 align-middle whitespace-nowrap">
                      <span className="inline-flex items-center text-xs font-medium text-slate-300">
                        {student.grade}
                      </span>
                    </td>
                    <td
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-3 text-center align-middle whitespace-nowrap"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditStudent(student)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors cursor-pointer"
                          title="تعديل الطالب"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentToDelete(student)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
                          title="حذف الطالب"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="block md:hidden divide-y divide-slate-800">
          {students.map((student, index) => {
            const studentNumber = startIndex + index + 1;
            return (
              <div
                key={student.id}
                onClick={() => router.push(`/teacher/students/${student.id}`)}
                className="p-3.5 flex flex-col gap-2.5 hover:bg-slate-800/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-800 text-xs font-semibold font-mono text-slate-400">
                      {studentNumber}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-slate-100 text-sm truncate">
                        {student.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs">
                        <span className="font-medium text-indigo-400">
                          {student.stage}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400">{student.grade}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronLeft size={18} className="text-slate-500 shrink-0" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="bg-slate-950/60 px-2.5 py-1.5 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-500 block mb-0.5">
                      رقم الطالب
                    </span>
                    <span
                      className="font-mono text-slate-300 truncate block"
                      dir="ltr"
                    >
                      {student.studentPhone || "—"}
                    </span>
                  </div>
                  <div className="bg-slate-950/60 px-2.5 py-1.5 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-500 block mb-0.5">
                      رقم ولي الأمر
                    </span>
                    <span
                      className="font-mono text-slate-300 truncate block"
                      dir="ltr"
                    >
                      {student.parentPhone || "—"}
                    </span>
                  </div>
                </div>
                <div
                  className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onEditStudent(student)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    <Pencil size={14} />
                    <span>تعديل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentToDelete(student)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!studentToDelete}
        onClose={() => !isDeleting && setStudentToDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
        title="حذف الطالب"
        message={`هل أنت متأكد من رغبتك في حذف الطالب "${studentToDelete?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف"
        cancelText="إلغاء"
      />
    </>
  );
};

export default StudentsTable;
