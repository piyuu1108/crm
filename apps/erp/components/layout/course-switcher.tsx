"use client";

import * as React from "react";
import { Dropdown, Button, Label, toast } from "@heroui/react";
import { BookOpen } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/lib/store/use-auth-store";

interface Course {
  id: number;
  code: string;
  name: string;
}

export function CourseSwitcher() {
  const { activeRole } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [courses, setCourses] = React.useState<Course[]>([]);
  const [activeCourseId, setActiveCourseId] = React.useState<string>("all");

  const isGlobalAdmin = activeRole === "principal" || activeRole === "vice_principal";

  React.useEffect(() => {
    if (!isGlobalAdmin) return;

    // Read cookie on mount
    const getActiveCourseCookie = () => {
      if (typeof document === "undefined") return "all";
      const match = document.cookie.match(/(?:^|;\s*)active_course_id=([^;]*)/);
      return match ? decodeURIComponent(match[1]) : "all";
    };
    setActiveCourseId(getActiveCourseCookie());

    // Fetch courses
    fetch("/api/courses")
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && Array.isArray(resData.data)) {
          setCourses(resData.data);
        }
      })
      .catch((err) => console.error("Failed to load courses:", err));
  }, [isGlobalAdmin]);

  if (!isGlobalAdmin) return null;

  const activeCourseName =
    activeCourseId === "all"
      ? "All Courses"
      : courses.find((c) => String(c.id) === activeCourseId)?.code || `Course ${activeCourseId}`;

  const handleCourseChange = async (keys: any) => {
    const selected = Array.from(keys)[0] as string;
    if (!selected) return;

    try {
      const res = await fetch("/api/auth/switch-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: selected }),
      });

      const data = await res.json();
      if (data.success) {
        setActiveCourseId(selected);
        toast.success(`Switched view to ${selected === "all" ? "All Courses" : selected}`);

        // Invalidate all queries to refresh the page data
        queryClient.invalidateQueries();
        router.refresh();
      } else {
        throw new Error(data.error || "Failed to switch course context");
      }
    } catch (err: any) {
      toast.danger(`Error: ${err.message}`);
    }
  };

  return (
    <Dropdown>
      <Button
        variant="secondary"
        size="sm"
        className="capitalize font-medium flex items-center gap-1.5 shrink-0"
      >
        <BookOpen className="size-3.5" />
        <span>View: {activeCourseName}</span>
      </Button>
      <Dropdown.Popover className="min-w-[180px]">
        <Dropdown.Menu
          selectionMode="single"
          selectedKeys={new Set([activeCourseId])}
          onSelectionChange={handleCourseChange}
        >
          <Dropdown.Item id="all" key="all" textValue="All Courses">
            <Dropdown.ItemIndicator />
            <Label className="capitalize font-semibold">All Courses</Label>
          </Dropdown.Item>
          {courses.map((course) => (
            <Dropdown.Item id={String(course.id)} key={String(course.id)} textValue={course.name}>
              <Dropdown.ItemIndicator />
              <Label className="capitalize">{course.code}</Label>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
