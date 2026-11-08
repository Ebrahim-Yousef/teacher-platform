"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StudentsContext } from "./StudentsContext";
import { useAuth } from "@/hooks/useAuth";
import {
  listStudents,
  createStudent as createStudentApi,
  updateStudent as updateStudentApi,
  deleteStudent as deleteStudentApi,
  StudentItem,
  StudentPayload,
} from "@/api/students";
import { buildQuery } from "@/api/client";

const SEARCH_DEBOUNCE_MS = 400;

export default function StudentsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, role, isTeacher, isAssistant } = useAuth();
  const normalizedRole = role ? role.toUpperCase() : "";
  const canLoadStudents =
    isTeacher ||
    isAssistant ||
    normalizedRole === "TEACHER" ||
    normalizedRole === "ASSISTANT" ||
    normalizedRole === "SUPER_ADMIN";

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStage, setSelectedStage] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(10);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [hasAnyStudents, setHasAnyStudents] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!token || !canLoadStudents) return undefined;

    const requestId = ++requestIdRef.current;
    let cancelled = false;

    const slowTimer = window.setTimeout(() => {
      if (!cancelled && requestIdRef.current === requestId) {
        setIsSlow(true);
      }
    }, 8000);

    const loadData = async () => {
      setIsLoading(true);
      setIsSlow(false);
      setError(null);
      try {
        const json = await listStudents({
          page: currentPage,
          limit: studentsPerPage,
          search: debouncedSearch || undefined,
          stage: selectedStage || undefined,
          grade: selectedGrade || undefined,
        });
        if (cancelled || requestIdRef.current !== requestId) return;

        const rows = Array.isArray(json.data) ? json.data : [];
        const total = json.meta?.total !== undefined ? json.meta.total : json.meta?.currentPage ? json.data.length : rows.length;
        const pages = json.meta?.totalPages ?? 1;

        setStudents(rows);
        setTotalStudents(total);
        setTotalPages(pages);

        const hasFilters = Boolean(
          debouncedSearch || selectedStage || selectedGrade,
        );
        if (!hasFilters) {
          setHasAnyStudents(total > 0);
        } else if (total > 0) {
          setHasAnyStudents(true);
        }
        setError(null);
      } catch (err: unknown) {
        if (cancelled || requestIdRef.current !== requestId) return;
        setError(err);
        setStudents([]);
      } finally {
        window.clearTimeout(slowTimer);
        if (!cancelled && requestIdRef.current === requestId) {
          setIsLoading(false);
          setIsSlow(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
    };
  }, [
    token,
    canLoadStudents,
    currentPage,
    studentsPerPage,
    debouncedSearch,
    selectedStage,
    selectedGrade,
    reloadKey,
  ]);

  const refetch = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleStageChange = useCallback((value: string) => {
    setSelectedStage(value);
    setSelectedGrade("");
    setCurrentPage(1);
  }, []);

  const handleGradeChange = useCallback((value: string) => {
    setSelectedGrade(value);
    setCurrentPage(1);
  }, []);

  const handleLimitChange = useCallback((limit: number) => {
    setStudentsPerPage(limit);
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearch("");
    setSelectedStage("");
    setSelectedGrade("");
    setCurrentPage(1);
  }, []);

  const createStudent = useCallback(async (body: StudentPayload) => {
    const json = await createStudentApi(body);
    setHasAnyStudents(true);
    setCurrentPage(1);
    setReloadKey((k) => k + 1);
    return json.data;
  }, []);

  const updateStudent = useCallback(
    async (id: string | number, body: Partial<StudentPayload>) => {
      const json = await updateStudentApi(id, body);
      setReloadKey((k) => k + 1);
      return json.data;
    },
    [],
  );

  const deleteStudent = useCallback(async (id: string | number) => {
    await deleteStudentApi(id);
    setReloadKey((k) => k + 1);
  }, []);

  const value = useMemo(
    () => ({
      students,
      paginatedStudents: students,
      filteredStudents: students,
      createStudent,
      updateStudent,
      deleteStudent,
      searchTerm,
      setSearchTerm: handleSearchChange,
      selectedStage,
      setSelectedStage: handleStageChange,
      selectedGrade,
      setSelectedGrade: handleGradeChange,
      currentPage,
      setCurrentPage,
      studentsPerPage,
      itemsPerPage: studentsPerPage,
      setStudentsPerPage: handleLimitChange,
      totalPages,
      totalStudents,
      clearFilters,
      isLoading,
      isSlow,
      error,
      hasAnyStudents,
      refetch,
      queryKey: buildQuery({
        page: currentPage,
        limit: studentsPerPage,
        search: debouncedSearch,
        stage: selectedStage,
        grade: selectedGrade,
      }),
    }),
    [
      students,
      createStudent,
      updateStudent,
      deleteStudent,
      searchTerm,
      handleSearchChange,
      selectedStage,
      handleStageChange,
      selectedGrade,
      handleGradeChange,
      currentPage,
      studentsPerPage,
      handleLimitChange,
      totalPages,
      totalStudents,
      clearFilters,
      isLoading,
      isSlow,
      error,
      hasAnyStudents,
      refetch,
      debouncedSearch,
    ],
  );

  return (
    <StudentsContext.Provider value={value}>
      {children}
    </StudentsContext.Provider>
  );
}
