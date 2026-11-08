"use client";

import React from "react";
import Modal from "../ui/Modal";
import StudentForm, { StudentFormData } from "./StudentForm";
import { SelectOption } from "../ui/Select";

export interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: StudentFormData | null;
  stagesOptions: SelectOption[];
  getGradesForStage: (stage: string) => SelectOption[];
  onSubmit: (data: StudentFormData) => Promise<void>;
}

export const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  onClose,
  student,
  stagesOptions,
  getGradesForStage,
  onSubmit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={student ? "تعديل بيانات الطالب" : "إضافة طالب جديد"}
    >
      <StudentForm
        student={student}
        stagesOptions={stagesOptions}
        getGradesForStage={getGradesForStage}
        onSubmit={async (data) => {
          await onSubmit(data);
          onClose();
        }}
        onCancel={onClose}
      />
    </Modal>
  );
};

export default StudentModal;
