"use client";

import React from "react";
import {
  Phone,
  MessageCircle,
  Edit,
  GraduationCap,
  School,
  User,
} from "lucide-react";
import Button from "../ui/Button";

export interface StudentInfo {
  id: string;
  name: string;
  studentPhone: string;
  parentPhone: string;
  stage: string;
  grade: string;
}

export interface StudentInfoCardProps {
  student: StudentInfo;
  onEdit: () => void;
}

const getWhatsAppLink = (phone: string): string => {
  const cleanPhone = phone.replace(/\D/g, "");
  return `https://wa.me/${cleanPhone}`;
};

export const StudentInfoCard: React.FC<StudentInfoCardProps> = ({
  student,
  onEdit,
}) => {
  const initials =
    student?.name
      ?.trim()
      .split(" ")
      .slice(0, 2)
      .map((word) => word[0])
      .join(" ")
      .toUpperCase() || "ط";

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-xl text-center dir-rtl">
      <div className="flex flex-col items-center">
        <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-indigo-600 text-2xl sm:text-3xl font-extrabold text-white shadow-lg shadow-indigo-600/30 ring-4 ring-indigo-500/20 select-none">
          {initials}
        </div>
        <h1 className="mt-4 text-xl sm:text-2xl font-bold text-slate-100">
          {student.name}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-400 font-medium flex items-center gap-1.5 justify-center">
          <User size={15} className="text-indigo-400" />
          <span>طالب مسجل</span>
        </p>
      </div>

      <hr className="my-6 border-slate-800" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-right">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition-all hover:border-slate-700">
          <p className="text-xs font-semibold text-slate-500">هاتف الطالب</p>
          <div className="mt-2 flex items-center justify-between">
            <span
              className="font-mono text-sm font-bold text-slate-200"
              dir="ltr"
            >
              {student.studentPhone}
            </span>
            <div className="flex items-center gap-2">
              <a
                href={getWhatsAppLink(student.studentPhone)}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 transition-all hover:bg-emerald-600 hover:text-white border border-emerald-500/20"
                title="تواصل عبر واتساب"
              >
                <MessageCircle size={18} />
              </a>
              <a
                href={`tel:${student.studentPhone}`}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300 transition-all hover:bg-slate-700 hover:text-white"
                title="اتصال تلفوني"
              >
                <Phone size={16} />
              </a>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition-all hover:border-slate-700">
          <p className="text-xs font-semibold text-slate-500">هاتف ولي الأمر</p>
          <div className="mt-2 flex items-center justify-between">
            <span
              className="font-mono text-sm font-bold text-slate-200"
              dir="ltr"
            >
              {student.parentPhone}
            </span>
            <div className="flex items-center gap-2">
              <a
                href={getWhatsAppLink(student.parentPhone)}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 transition-all hover:bg-emerald-600 hover:text-white border border-emerald-500/20"
                title="تواصل عبر واتساب"
              >
                <MessageCircle size={18} />
              </a>
              <a
                href={`tel:${student.parentPhone}`}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300 transition-all hover:bg-slate-700 hover:text-white"
                title="اتصال تلفوني"
              >
                <Phone size={16} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-right">
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <p className="text-xs font-semibold text-slate-400">
            المرحلة الدراسية
          </p>
          <div className="mt-1.5 flex items-center gap-2 text-indigo-400 font-bold text-sm sm:text-base">
            <GraduationCap size={18} />
            <span>{student.stage}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs font-semibold text-slate-400">الصف الدراسي</p>
          <div className="mt-1.5 flex items-center gap-2 text-slate-200 font-bold text-sm sm:text-base">
            <School size={18} className="text-slate-400" />
            <span>{student.grade}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-2">
        <Button
          onClick={onEdit}
          variant="primary"
          size="lg"
          className="w-full flex items-center justify-center gap-2"
        >
          <Edit size={18} />
          <span>تعديل بيانات الطالب</span>
        </Button>
      </div>
    </div>
  );
};

export default StudentInfoCard;
