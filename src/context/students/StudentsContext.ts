import { createContext } from "react";
import { StudentItem, StudentPayload } from "@/api/students";

export interface StudentsContextType {
  students: StudentItem[];
  paginatedStudents: StudentItem[];
  filteredStudents: StudentItem[];
  createStudent: (body: StudentPayload) => Promise<StudentItem>;
  updateStudent: (
    id: string | number,
    body: Partial<StudentPayload>,
  ) => Promise<StudentItem>;
  deleteStudent: (id: string | number) => Promise<void>;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedStage: string;
  setSelectedStage: (value: string) => void;
  selectedGrade: string;
  setSelectedGrade: (value: string) => void;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  studentsPerPage: number;
  itemsPerPage: number;
  setStudentsPerPage: (limit: number) => void;
  totalPages: number;
  totalStudents: number;
  clearFilters: () => void;
  isLoading: boolean;
  isSlow: boolean;
  error: unknown;
  hasAnyStudents: boolean;
  refetch: () => void;
  queryKey: string;
}

export const StudentsContext = createContext<StudentsContextType | null>(null);
