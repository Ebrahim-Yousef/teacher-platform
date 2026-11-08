import { useContext } from "react";
import { StudentsContext } from "@/context/students/StudentsContext";

export const useStudents = () => {
  const ctx = useContext(StudentsContext);
  if (!ctx) {
    throw new Error("useStudents must be used within StudentsProvider");
  }
  return ctx;
};
