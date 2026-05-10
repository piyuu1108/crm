import {
  SquareChartBar,
  Persons,
  GraduationCap,
  Calendar,
  ChartColumn,
  ListCheck,
  Person,
  Tray,
  LayoutCells,
  BookOpen,
  FileText,
  PencilToSquare,
  Gift,
  ArrowShapeTurnUpRight,
} from "@gravity-ui/icons";
import type { SVGProps } from "react";

export type Role = "student" | "faculty" | "counselor" | "hod" | "admin";

export interface NavItem {
  title: string;
  href?: string;
  icon?: React.FC<SVGProps<SVGSVGElement>>;
  roles: Role[];
  badge?: number; // E.g., for unread requests
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
        icon: SquareChartBar,
        roles: ["student", "faculty", "counselor", "hod", "admin"],
      },
      {
        title: "Circulars",
        href: "/app/circulars",
        icon: FileText,
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
        icon: Calendar,
        roles: ["student", "faculty", "counselor", "hod", "admin"],
      },
      {
        title: "Attendance",
        href: "/app/academics/attendance",
        icon: ListCheck,
        roles: ["student", "faculty", "counselor", "hod"],
      },
      {
        title: "Internal Exams",
        href: "/app/academics/internal-exams",
        icon: PencilToSquare,
        roles: ["student", "faculty", "counselor", "hod"],
      },
      {
        title: "Exam Evaluation",
        href: "/app/academics/internal-exams/evaluation",
        icon: ListCheck,
        roles: ["faculty", "counselor", "hod"],
      },
      {
        title: "Export Marks",
        href: "/app/academics/internal-exams/export",
        icon: Tray,
        roles: ["counselor", "hod"],
      },
      {
        title: "Reports",
        href: "/app/academics/reports",
        icon: ChartColumn,
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
        icon: LayoutCells,
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
        href: "/app/admin/subjects/add",
        icon: BookOpen,
        roles: ["hod", "admin"],
      },
      {
        title: "Assignments",
        icon: ListCheck,
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
        icon: Calendar,
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
        icon: LayoutCells,
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
        icon: Tray,
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
        icon: Person,
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
