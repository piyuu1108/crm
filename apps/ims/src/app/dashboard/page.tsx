"use client";

import { useMemo } from "react";
import { Card } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useDataContext } from "@/contexts/DataContext";

const STAT_CARDS = [
  { key: "faculty" as const, label: "Faculty Members", icon: "gravity-ui:persons", chipColor: "primary" as const },
  { key: "subjects" as const, label: "Subjects", icon: "gravity-ui:book-open", chipColor: "secondary" as const },
  { key: "classes" as const, label: "Classes", icon: "gravity-ui:layers-3-diagonal", chipColor: "warning" as const },
  { key: "assignments" as const, label: "Assignments", icon: "gravity-ui:layout-cells-large", chipColor: "danger" as const },
];

export default function DashboardPage() {
  const { faculty, subjects, classes } = useDataContext();

  const stats = useMemo(
    () => ({
      faculty: faculty.length,
      subjects: subjects.length,
      classes: classes.length,
      assignments: subjects.reduce(
        (sum, s) => sum + (s.assignments?.length || 0),
        0
      ),
    }),
    [faculty, subjects, classes]
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted mt-1">
          Faculty Subject Assignment Management System overview
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map((card) => (
          <Card key={card.key} className="flex-row items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-${card.chipColor}/10 text-${card.chipColor}`}>
              <Icon icon={card.icon} width={22} />
            </div>
            <Card.Header className="p-0">
              <Card.Title className="text-2xl font-bold">{stats[card.key]}</Card.Title>
              <Card.Description>{card.label}</Card.Description>
            </Card.Header>
          </Card>
        ))}
      </div>

      {/* Quick Navigation */}
      <Card>
        <Card.Header>
          <Card.Title>Quick Navigation</Card.Title>
          <Card.Description>Jump to any module</Card.Description>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-3 gap-3">
            {[
              { href: "/dashboard/settings", label: "Manage Settings", desc: "Courses, specializations, workload limits", icon: "gravity-ui:gear" },
              { href: "/dashboard/faculty", label: "Manage Faculty", desc: "Add, edit, and view faculty members", icon: "gravity-ui:persons" },
              { href: "/dashboard/subjects", label: "Manage Subjects", desc: "Add, edit subjects with credits and types", icon: "gravity-ui:book-open" },
              { href: "/dashboard/classes", label: "Manage Classes", desc: "Create classes with auto-naming", icon: "gravity-ui:layers-3-diagonal" },
              { href: "/dashboard/assignments", label: "Assignment Matrix", desc: "Assign faculty to subject-class cells", icon: "gravity-ui:layout-cells-large" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-start gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-surface-alt flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Icon icon={item.icon} width={18} className="text-muted group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted mt-0.5">{item.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
