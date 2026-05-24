import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarDays,
  BarChart3,
  ListChecks,
  User,
  Inbox,
  Grid3X3,
  BookOpen,
  FileText,
  PenSquare,
  Gift,
  Share2,
  Bell,
  
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Role = "student" | "faculty" | "counselor" | "hod" | "admin";

export interface NavItem {
  title: string;
  href?: string;
  icon?: LucideIcon;
  roles: Role[];
  badge?: number;
  children?: NavItem[];
}

export interface NavSection {
  section: string;
  items: NavItem[];
}

export const navigationConfig: NavSection[] = [
  // ─── Overview ─────────────────────────────────────────────────────────────────
  {
    section: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/app/dashboard",
        icon: LayoutDashboard,
        roles: ["student", "faculty", "counselor", "hod", "admin"],
      },
      {
        title: "Circulars",
        href: "/app/circulars",
        icon: FileText,
        roles: ["student", "faculty", "counselor", "hod", "admin"],
      },
      {
        title: "Notifications",
        href: "/app/notifications",
        icon: Bell,
        roles: ["student", "faculty", "counselor", "hod", "admin"],
      },
    ],
  },

  // ─── Academics ────────────────────────────────────────────────────────────────
  {
    section: "Academics",
    items: [
      {
        title: "Subjects",
        href: "/app/subjects",
        icon: BookOpen,
        roles: ["student", "faculty", "counselor"],
      },
      {
        title: "Timetable",
        href: "/app/academics/timetable",
        icon: CalendarDays,
        roles: ["student", "faculty", "counselor", "hod", "admin"],
      },
      {
        title: "Attendance",
        href: "/app/academics/attendance",
        icon: ListChecks,
        roles: ["student", "faculty", "counselor", "hod"],
      },
      {
        title: "Internal Exams",
        href: "/app/academics/internal-exams",
        icon: PenSquare,
        roles: ["student", "faculty", "counselor", "hod"],
      },
      {
        title: "Exam Evaluation",
        href: "/app/academics/internal-exams/evaluation",
        icon: ListChecks,
        roles: ["faculty", "counselor", "hod"],
      },
      {
        title: "Export Marks",
        href: "/app/academics/internal-exams/export",
        icon: Inbox,
        roles: ["counselor", "hod"],
      },
      {
        title: "Reports",
        href: "/app/academics/reports",
        icon: BarChart3,
        roles: ["counselor", "hod", "admin"],
      },
    ],
  },

  // ─── Administration ───────────────────────────────────────────────────────────
  {
    section: "Administration",
    items: [
      {
        title: "Divisions",
        href: "/app/admin/divisions",
        icon: Grid3X3,
        roles: ["hod", "admin"],
      },
      {
        title: "Faculty",
        href: "/app/admin/faculty",
        icon: GraduationCap,
        roles: ["hod", "admin"],
      },
      {
        title: "Manage Subjects",
        href: "/app/admin/subjects",
        icon: BookOpen,
        roles: ["hod", "admin"],
      },
      {
        title: "Assignments",
        icon: ListChecks,
        roles: ["hod", "admin"],
        children: [
          {
            title: "Counselor",
            href: "/app/admin/assignments",
            roles: ["hod", "admin"],
          },
          {
            title: "Subject",
            href: "/app/admin/subject-assignments",
            roles: ["hod", "admin"],
          },
        ],
      },
      {
        title: "Timetable Management",
        href: "/app/admin/timetable",
        icon: CalendarDays,
        roles: ["hod", "admin"],
      },
    ],
  },

  // ─── Counselor ────────────────────────────────────────────────────────────────
  {
    section: "Counselor",
    items: [
      {
        title: "My Divisions",
        href: "/app/counselor/divisions",
        icon: Grid3X3,
        roles: ["counselor"],
      },
    ],
  },

  // ─── Workflows ────────────────────────────────────────────────────────────────
  {
    section: "Workflows",
    items: [
      {
        title: "Requests",
        href: "/app/workflows/requests",
        icon: Bell,
        roles: ["student", "faculty", "counselor", "hod", "admin"],
        badge: 3,
      },
    ],
  },

  // ─── Account ──────────────────────────────────────────────────────────────────
  {
    section: "Account",
    items: [
      {
        title: "Profile",
        href: "/app/profile",
        icon: User,
        roles: ["student", "faculty", "counselor", "hod", "admin"],
      },
    ],
  },

  // ─── Surprise ─────────────────────────────────────────────────────────────────
  {
    section: "Surprise",
    items: [
      {
        title: "Surprise",
        href: "/app/surprice",
        icon: Gift,
        roles: ["faculty"],
      },
    ],
  },
];
