"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from "react";

// ─── Types ─────────────────────────────────────────────────
export interface Course {
  id: number;
  name: string;
}

export interface Specialization {
  id: number;
  name: string;
  shortCode: string;
  courseId: number;
}

export interface FacultyRow {
  id: number;
  name: string;
  code: string;
  courseId: number;
  totalLoad: number;
  assignments: {
    subjectName: string;
    subjectCode: string;
    subjectShortCode: string;
    subjectCredit: number;
    className: string;
  }[];
}

export interface SubjectRow {
  id: number;
  code: string;
  name: string;
  shortCode: string;
  credit: number;
  type: string;
  courseId: number;
  semester: number;
  assignments: {
    className: string;
    facultyCode: string;
    facultyName: string;
  }[];
}

export interface ClassRow {
  id: number;
  name: string;
  year: number;
  semester: number;
  courseId: number;
  specializationId: number;
  divisionNumber: number;
  specName: string;
  specShortCode: string;
  assignments: {
    subjectShortCode: string;
    subjectName: string;
    facultyCode: string;
    facultyName: string;
  }[];
}

type CacheKey =
  | "courses"
  | "faculty"
  | "subjects"
  | "classes"
  | "specializations"
  | "workloadLimit"
  | "all";

interface DataContextType {
  // Raw data (all, unfiltered)
  courses: Course[];
  allFaculty: FacultyRow[];
  allSubjects: SubjectRow[];
  allClasses: ClassRow[];
  allSpecializations: Specialization[];
  workloadLimit: number;

  // Filtered by current courseId
  faculty: FacultyRow[];
  subjects: SubjectRow[];
  classes: ClassRow[];
  specializations: Specialization[];

  // Course selection
  courseId: number | null;
  setCourseId: (id: number | null) => void;

  // Cache control
  invalidate: (...keys: CacheKey[]) => Promise<void>;

  // Loading state (only for initial load)
  isLoading: boolean;
}

const DataContext = createContext<DataContextType>({
  courses: [],
  allFaculty: [],
  allSubjects: [],
  allClasses: [],
  allSpecializations: [],
  workloadLimit: 18,
  faculty: [],
  subjects: [],
  classes: [],
  specializations: [],
  courseId: null,
  setCourseId: () => {},
  invalidate: async () => {},
  isLoading: true,
});

// ─── Fetchers ──────────────────────────────────────────────
async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`fetchJSON: ${url} responded with ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`fetchJSON: ${url} failed`, err);
    return null;
  }
}

// ─── Provider ──────────────────────────────────────────────
export function DataProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [allFaculty, setAllFaculty] = useState<FacultyRow[]>([]);
  const [allSubjects, setAllSubjects] = useState<SubjectRow[]>([]);
  const [allClasses, setAllClasses] = useState<ClassRow[]>([]);
  const [allSpecializations, setAllSpecializations] = useState<Specialization[]>([]);
  const [workloadLimit, setWorkloadLimit] = useState(18);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Guard against state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Individual fetchers (for selective invalidation)
  const refreshCourses = useCallback(async () => {
    const data = await fetchJSON<Course[]>("/api/courses");
    if (mountedRef.current && Array.isArray(data)) setCourses(data);
    return data;
  }, []);

  const refreshFaculty = useCallback(async () => {
    const data = await fetchJSON<FacultyRow[]>("/api/faculty");
    if (mountedRef.current && Array.isArray(data)) setAllFaculty(data);
  }, []);

  const refreshSubjects = useCallback(async () => {
    const data = await fetchJSON<SubjectRow[]>("/api/subjects");
    if (mountedRef.current && Array.isArray(data)) setAllSubjects(data);
  }, []);

  const refreshClasses = useCallback(async () => {
    const data = await fetchJSON<ClassRow[]>("/api/classes");
    if (mountedRef.current && Array.isArray(data)) setAllClasses(data);
  }, []);

  const refreshSpecializations = useCallback(async () => {
    const data = await fetchJSON<Specialization[]>("/api/specializations");
    if (mountedRef.current && Array.isArray(data)) setAllSpecializations(data);
  }, []);

  const refreshWorkloadLimit = useCallback(async () => {
    const data = await fetchJSON<{ maxWeeklyWorkload: number }>("/api/settings");
    if (mountedRef.current && data?.maxWeeklyWorkload) setWorkloadLimit(data.maxWeeklyWorkload);
  }, []);

  // Initial parallel fetch
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      try {
        const [coursesData] = await Promise.all([
          refreshCourses(),
          refreshFaculty(),
          refreshSubjects(),
          refreshClasses(),
          refreshSpecializations(),
          refreshWorkloadLimit(),
        ]);

        if (cancelled) return;

        // Auto-select course on first load
        if (Array.isArray(coursesData) && coursesData.length > 0) {
          const bca = coursesData.find(
            (c: Course) => c.name.toUpperCase() === "BCA"
          );
          setCourseId(bca ? bca.id : coursesData[0].id);
        }
      } catch (err) {
        console.error("Failed to load initial data:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadAll();

    return () => { cancelled = true; };
  }, [refreshCourses, refreshFaculty, refreshSubjects, refreshClasses, refreshSpecializations, refreshWorkloadLimit]);

  // Selective invalidation
  const invalidate = useCallback(
    async (...keys: CacheKey[]) => {
      const refreshMap: Record<string, () => Promise<void | Course[] | null>> = {
        courses: refreshCourses,
        faculty: refreshFaculty,
        subjects: refreshSubjects,
        classes: refreshClasses,
        specializations: refreshSpecializations,
        workloadLimit: refreshWorkloadLimit,
      };

      if (keys.includes("all")) {
        await Promise.all(
          Object.values(refreshMap).map((fn) => fn())
        );
      } else {
        await Promise.all(
          keys.map((key) => refreshMap[key]?.())
        );
      }
    },
    [
      refreshCourses,
      refreshFaculty,
      refreshSubjects,
      refreshClasses,
      refreshSpecializations,
      refreshWorkloadLimit,
    ]
  );

  // Derived filtered views (memoized — recomputed only when courseId or data changes)
  const faculty = useMemo(
    () =>
      courseId
        ? allFaculty.filter((f) => f.courseId === courseId)
        : allFaculty,
    [courseId, allFaculty]
  );

  const subjects = useMemo(
    () =>
      courseId
        ? allSubjects.filter((s) => s.courseId === courseId)
        : allSubjects,
    [courseId, allSubjects]
  );

  const classes = useMemo(
    () =>
      courseId
        ? allClasses.filter((c) => c.courseId === courseId)
        : allClasses,
    [courseId, allClasses]
  );

  const specializations = useMemo(
    () =>
      courseId
        ? allSpecializations.filter((s) => s.courseId === courseId)
        : allSpecializations,
    [courseId, allSpecializations]
  );

  const value = useMemo<DataContextType>(
    () => ({
      courses,
      allFaculty,
      allSubjects,
      allClasses,
      allSpecializations,
      workloadLimit,
      faculty,
      subjects,
      classes,
      specializations,
      courseId,
      setCourseId,
      invalidate,
      isLoading,
    }),
    [
      courses,
      allFaculty,
      allSubjects,
      allClasses,
      allSpecializations,
      workloadLimit,
      faculty,
      subjects,
      classes,
      specializations,
      courseId,
      invalidate,
      isLoading,
    ]
  );

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataContext() {
  return useContext(DataContext);
}
