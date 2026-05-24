"use client";

import * as React from "react";
import {
  Avatar,
  Button,
  Chip,
  Dropdown,
  Label,
  Tooltip,
  toast,
} from "@heroui/react";
import { Copy, MoreHorizontal } from "lucide-react";
import { useFacultyListQuery, type FacultyListItem } from "@/app/lib/queries/faculty";
import { DataTable, type TableColumnDef } from "./data-table";

const COLUMNS: TableColumnDef[] = [
  { name: "Code", uid: "facultyCode", allowsSorting: true, isRowHeader: true },
  { name: "Member", uid: "name", allowsSorting: true },
  { name: "Designation", uid: "designation", allowsSorting: true },
  { name: "Status", uid: "isActive", allowsSorting: true },
  { name: "Assignments", uid: "assignments", allowsSorting: true },
  { name: "Mobile", uid: "mobile" },
  { name: "Actions", uid: "actions", className: "text-end" },
];

const INITIAL_VISIBLE_COLUMNS = ["facultyCode", "name", "designation", "isActive", "assignments", "actions"];

export function EmployeeTable() {
  const [mounted, setMounted] = React.useState(false);

  // Fetch all faculty members (limit 1000 for frontend pagination)
  const { data, isLoading, isError, error, refetch } = useFacultyListQuery(
    React.useMemo(() => ({ page: 1, limit: 1000 }), [])
  );

  const filteredFaculties = React.useMemo(() => {
    const facultyList = data?.faculty || [];
    return facultyList.filter((f) => f.facultyCode !== "QUIZ");
  }, [data?.faculty]);

  React.useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Code copied to clipboard!");
  };

  const renderCell = React.useCallback((emp: FacultyListItem, columnKey: string) => {
    switch (columnKey) {
      case "facultyCode":
        return (
          <div className="flex items-center gap-2">
            <span className="font-semibold tabular-nums">{emp.facultyCode}</span>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label="Copy ID"
              onPress={() => copyToClipboard(emp.facultyCode)}
            >
              <Copy className="size-3.5 text-default-400" />
            </Button>
          </div>
        );

      case "name":
        return (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium">{emp.name}</span>
          </div>
        );

      case "designation":
        return <span>{emp.designation || "—"}</span>;

      case "isActive":
        return (
          <Chip size="sm" variant="soft" color={emp.isActive ? "success" : "danger"}>
            {emp.isActive ? "Active" : "Inactive"}
          </Chip>
        );

      case "assignments":
        return (
          <div className="flex flex-wrap gap-1">
            {emp.assignments && emp.assignments.length > 0 ? (
              emp.assignments.map((a, i) => (
                <Tooltip key={i}>
                  <Tooltip.Trigger>
                    <Chip size="sm" variant="soft" className="cursor-default">
                      {a.subjectShortCode}/{a.divisionName}
                    </Chip>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <div className="flex flex-col gap-1 px-1 py-1">
                      <div className="font-semibold text-small">{a.subjectName}</div>
                      <div className="text-tiny text-default-500">
                        {a.subjectCode} • {a.subjectType} • {a.subjectCredit} Credits
                      </div>
                      <div className="text-tiny text-default-500 mt-1">
                        Assigned to: {a.divisionName}
                      </div>
                    </div>
                  </Tooltip.Content>
                </Tooltip>
              ))
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        );

      case "mobile":
        return <span className="tabular-nums text-xs text-foreground/80">{emp.mobile}</span>;

      case "actions":
        return (
          <div className="flex items-center justify-end gap-0.5 min-h-[32px]">
            {mounted && (
              <Dropdown>
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  className="bg-transparent hover:bg-default-100"
                  aria-label="Actions"
                >
                  <MoreHorizontal className="size-4 text-default-500" />
                </Button>
                <Dropdown.Popover>
                  <Dropdown.Menu aria-label="Faculty actions">
                    <Dropdown.Item id="view" textValue="View details">
                      <Label>View details</Label>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            )}
          </div>
        );

      default:
        return null;
    }
  }, [mounted]);

  return (
    <DataTable
      data={filteredFaculties}
      columns={COLUMNS}
      initialVisibleColumns={INITIAL_VISIBLE_COLUMNS}
      searchKeys={["name", "facultyCode", "email", "designation"]}
      searchPlaceholder="Search faculties..."
      renderCell={renderCell as any}
      localStorageKey="hod_faculty_table_columns"
      title="All Faculties"
      isLoading={isLoading}
      isError={isError}
      error={error}
      refetch={refetch}
    />
  );
}
