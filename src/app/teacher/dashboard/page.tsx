"use client";

import React, { useState, useMemo } from "react";
import { Download } from "lucide-react";
import StudentsHeader from "@/components/students/StudentsHeader";
import StudentsTable, {
  StudentItem as TableStudentItem,
} from "@/components/students/StudentsTable";
import StudentModal from "@/components/students/StudentModal";
import StudentsCount from "@/components/students/StudentsCount";
import Pagination from "@/components/ui/PaginationControls";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useStudents } from "@/hooks/useStudents";
import { downloadExport } from "@/api/exports";
import { getErrorMessage } from "@/api/errors";
import { StudentPayload } from "@/api/students";
import { StudentFormData } from "@/components/students/StudentForm";
import { SelectOption } from "@/components/ui/Select";
import { STAGES, STAGES_GRADES } from "@/constants/stages";

export default function TeacherDashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentFormData | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { token } = useAuth();
  const { toast } = useToast();

  const {
    students,
    totalStudents,
    searchTerm,
    setSearchTerm,
    selectedStage,
    setSelectedStage,
    selectedGrade,
    setSelectedGrade,
    clearFilters,
    currentPage,
    totalPages,
    setCurrentPage,
    studentsPerPage,
    isLoading,
    isSlow,
    error,
    hasAnyStudents,
    refetch,
    createStudent,
    updateStudent,
    deleteStudent,
  } = useStudents();

  // تحويل قائمة المراحل من constants/stages إلى خيارات للـ Select
  const stagesOptions: SelectOption[] = useMemo(() => {
    return STAGES.map((stage) => ({
      value: stage,
      label: stage,
    }));
  }, []);

  // دالة جلب خيارات الصفوف لمرحلة معينة
  const getGradesForStage = (stageName: string): SelectOption[] => {
    const grades = STAGES_GRADES[stageName] || [];
    return grades.map((grade) => ({
      value: grade,
      label: grade,
    }));
  };

  // الخيارات الحالية للصفوف بناءً على المرحلة المختارة في الهيدر
  const currentGradesOptions: SelectOption[] = useMemo(() => {
    return selectedStage ? getGradesForStage(selectedStage) : [];
  }, [selectedStage]);

  const handleAddStudent = () => {
    setSelectedStudent(null);
    setIsModalOpen(true);
  };

  const handleEditStudent = (student: TableStudentItem) => {
    setSelectedStudent({
      id: student.id,
      name: student.name,
      studentPhone: student.studentPhone || "",
      parentPhone: student.parentPhone || "",
      stage: student.stage,
      grade: student.grade,
    });
    setIsModalOpen(true);
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await deleteStudent(studentId);
      toast.success("تم حذف الطالب بنجاح");
    } catch (err) {
      toast.error(getErrorMessage(err, "تعذر حذف الطالب"));
      throw err;
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadExport(
        "/exports/students?format=csv",
        token || undefined,
        "students.csv",
      );
      toast.success("تم تنزيل ملف الطلاب بنجاح");
    } catch (err) {
      toast.error(getErrorMessage(err, "تعذر تنزيل الملف"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleModalSubmit = async (data: StudentFormData) => {
    const payload: StudentPayload = {
      name: data.name,
      studentPhone: data.studentPhone,
      parentPhone: data.parentPhone,
      stage: data.stage,
      grade: data.grade,
    };

    if (data.id) {
      await updateStudent(data.id, payload);
      toast.success("تم تحديث بيانات الطالب بنجاح");
    } else {
      await createStudent(payload);
      toast.success("تم إضافة الطالب بنجاح");
    }
  };

  const hasFilters = Boolean(searchTerm || selectedStage || selectedGrade);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            إدارة الطلاب
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
            عرض وتحديث ومتابعة كافة الطلاب والصفوف الدراسية
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={isExporting}
            onClick={handleExport}
          >
            <Download size={16} />
            تصدير CSV
          </Button>
          <StudentsCount totalStudents={totalStudents} />
        </div>
      </div>

      {/* Search & Filters */}
      <StudentsHeader
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedStage={selectedStage}
        setSelectedStage={setSelectedStage}
        selectedGrade={selectedGrade}
        setSelectedGrade={setSelectedGrade}
        stagesOptions={stagesOptions}
        gradesOptions={currentGradesOptions}
        onClearFilters={clearFilters}
        onAddStudent={handleAddStudent}
      />

      {/* Main Table */}
      <StudentsTable
        students={students as TableStudentItem[]}
        currentPage={currentPage}
        itemsPerPage={studentsPerPage}
        isLoading={isLoading}
        isSlow={isSlow}
        error={error ? getErrorMessage(error, "فشل تحميل قائمة الطلاب") : null}
        hasAnyStudents={hasAnyStudents}
        hasFilters={hasFilters}
        onRetry={refetch}
        onEditStudent={handleEditStudent}
        onDeleteStudent={handleDeleteStudent}
        onAddStudent={handleAddStudent}
      />

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => setCurrentPage(page)}
      />

      {/* Add / Edit Modal */}
      <StudentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        student={selectedStudent}
        stagesOptions={stagesOptions}
        getGradesForStage={getGradesForStage}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
}
