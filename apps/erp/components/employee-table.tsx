"use client";

import * as React from "react";
import {
  Table,
  Avatar,
  Button,
  Chip,
  SearchField,
  Dropdown,
  Label,
  Pagination,
  Tooltip,
  toast,
  Spinner,
  type SortDescriptor,
} from "@heroui/react";
import {
  Copy,
  SlidersHorizontal,
  ArrowDownUp,
  Columns3,
  MoreHorizontal,
  ChevronUp,
} from "lucide-react";
import { useFacultyListQuery, type FacultyListItem } from "@/app/lib/queries/faculty";

// ─── Sortable column header ───────────────────────────────────────────────────
function SortableColumnHeader({
  children,
  sortDirection,
}: {
  children: React.ReactNode;
  sortDirection?: "ascending" | "descending";
}) {
  return (
    <span className="flex items-center justify-between w-full">
      {children}
      {!!sortDirection && (
        <ChevronUp
          className={`size-3.5 transform transition-transform duration-100 ease-out ${
            sortDirection === "descending" ? "rotate-180" : ""
          }`}
        />
      )}
    </span>
  );
}


const COLUMNS = [
  { name: "Code", uid: "facultyCode" },
  { name: "Member", uid: "name" },
  { name: "Designation", uid: "designation" },
  { name: "Status", uid: "isActive" },
  { name: "Assignments", uid: "assignments" },
  { name: "Mobile", uid: "mobile" },
];

const INITIAL_VISIBLE_COLUMNS = ["facultyCode", "name", "designation", "isActive", "assignments"];

export function EmployeeTable() {
  const [mounted, setMounted] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  const [visibleColumns, setVisibleColumns] = React.useState<Set<string>>(
    new Set(INITIAL_VISIBLE_COLUMNS)
  );

  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: "name",
    direction: "ascending",
  });


  // Fetch all faculty members (limit 1000 for frontend pagination)
  const { data, isLoading, isError, error, refetch } = useFacultyListQuery(
    React.useMemo(() => ({ page: 1, limit: 1000 }), [])
  );

  React.useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Columns visibility persistence
  React.useEffect(() => {
    const saved = localStorage.getItem("hod_faculty_table_columns");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setVisibleColumns(new Set(parsed));
        }
      } catch (e) {}
    }
  }, []);

  const handleColumnSelectionChange = (keys: any) => {
    if (keys === "all") {
      const allKeys = COLUMNS.map((c) => c.uid);
      setVisibleColumns(new Set(allKeys));
      localStorage.setItem("hod_faculty_table_columns", JSON.stringify(allKeys));
      return;
    }
    const newKeys = Array.from(keys) as string[];
    setVisibleColumns(new Set(newKeys));
    localStorage.setItem("hod_faculty_table_columns", JSON.stringify(newKeys));
  };

  const handleSortChange = (descriptor: SortDescriptor) => {
    setSortDescriptor(descriptor);
    setPage(1);

    const colName = COLUMNS.find((c) => c.uid === descriptor.column)?.name || descriptor.column;
    toast.info(`Sorting by ${colName} (${descriptor.direction === "ascending" ? "ascending" : "descending"})`);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Code copied to clipboard!");
  };

  const filteredFaculty = React.useMemo(() => {
    const facultyList = data?.faculty || [];
    if (!searchQuery) return facultyList;

    const q = searchQuery.toLowerCase();
    return facultyList.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.facultyCode.toLowerCase().includes(q) ||
        f.email.toLowerCase().includes(q) ||
        (f.designation && f.designation.toLowerCase().includes(q))
    );
  }, [data?.faculty, searchQuery]);

  const sortedFaculty = React.useMemo(() => {
    const list = [...filteredFaculty];
    if (sortDescriptor.column) {
      list.sort((a, b) => {
        let first = a[sortDescriptor.column as keyof typeof a];
        let second = b[sortDescriptor.column as keyof typeof b];

        if (first === undefined || first === null) first = "";
        if (second === undefined || second === null) second = "";

        let cmp = 0;
        if (typeof first === "string" && typeof second === "string") {
          cmp = first.localeCompare(second);
        } else {
          cmp = first < second ? -1 : first > second ? 1 : 0;
        }
        return sortDescriptor.direction === "descending" ? -cmp : cmp;
      });
    }
    return list;
  }, [filteredFaculty, sortDescriptor]);

  const totalPages = Math.max(1, Math.ceil(sortedFaculty.length / itemsPerPage));
  const paginatedFaculty = sortedFaculty.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const startItem = sortedFaculty.length === 0 ? 0 : (page - 1) * itemsPerPage + 1;
  const endItem = Math.min(page * itemsPerPage, sortedFaculty.length);

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 3) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (page <= 2) {
        pages.push(2);
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (page >= totalPages - 1) {
        pages.push("ellipsis");
        pages.push(totalPages - 1);
        pages.push(totalPages);
      } else {
        pages.push("ellipsis");
        pages.push(page);
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Spinner size="lg" color="accent" />
        <p className="text-xs text-muted-foreground">Loading faculties...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <p className="text-sm font-semibold text-danger">Failed to load faculties</p>
        <p className="text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "An unexpected error occurred"}
        </p>
        <Button size="sm" variant="tertiary" onPress={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Title */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold text-foreground">
            All Faculties
          </span>
          <Chip size="sm" variant="soft">{sortedFaculty.length}</Chip>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SearchField
            aria-label="Search faculties"
            className="w-full sm:w-[220px]"
            value={searchQuery}
            onChange={handleSearchChange}
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <div className="flex flex-wrap items-center gap-2">
            <Dropdown>
              <Button size="sm" variant="tertiary">
                Rows: {itemsPerPage}
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  aria-label="Rows per page"
                  selectionMode="single"
                  selectedKeys={new Set([String(itemsPerPage)])}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    if (selected) {
                      setItemsPerPage(Number(selected));
                      setPage(1);
                    }
                  }}
                >
                  <Dropdown.Item id="10" textValue="10 rows">
                    <Dropdown.ItemIndicator />
                    <Label>10</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="20" textValue="20 rows">
                    <Dropdown.ItemIndicator />
                    <Label>20</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="50" textValue="50 rows">
                    <Dropdown.ItemIndicator />
                    <Label>50</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
            <Button size="sm" variant="tertiary" onPress={() => {
              toast.info("Click on table headers to sort.");
            }}>
              <ArrowDownUp className="size-4" />
              Sort
            </Button>
            <Dropdown>
              <Button size="sm" variant="tertiary">
                <Columns3 className="size-4" />
                Columns
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  disallowEmptySelection
                  aria-label="Table Columns"
                  selectedKeys={visibleColumns}
                  selectionMode="multiple"
                  onSelectionChange={handleColumnSelectionChange}
                >
                  {COLUMNS.map((column) => (
                    <Dropdown.Item id={column.uid} key={column.uid} textValue={column.name}>
                      <Dropdown.ItemIndicator />
                      <Label>{column.name}</Label>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="w-full min-w-0 max-w-full overflow-hidden">
        <Table>
          <Table.ScrollContainer className="w-full overflow-x-auto">
            <Table.Content
              aria-label="All faculties"
              className="min-w-[700px]"
              sortDescriptor={sortDescriptor}
              onSortChange={(desc) => handleSortChange(desc as any)}
            >
              <Table.Header>
                {visibleColumns.has("facultyCode") && (
                  <Table.Column isRowHeader allowsSorting id="facultyCode">
                    {({ sortDirection }) => (
                      <SortableColumnHeader sortDirection={sortDirection}>Code</SortableColumnHeader>
                    )}
                  </Table.Column>
                )}
                {visibleColumns.has("name") && (
                  <Table.Column allowsSorting id="name">
                    {({ sortDirection }) => (
                      <SortableColumnHeader sortDirection={sortDirection}>Member</SortableColumnHeader>
                    )}
                  </Table.Column>
                )}
                {visibleColumns.has("designation") && (
                  <Table.Column allowsSorting id="designation">
                    {({ sortDirection }) => (
                      <SortableColumnHeader sortDirection={sortDirection}>Role</SortableColumnHeader>
                    )}
                  </Table.Column>
                )}
                {visibleColumns.has("isActive") && (
                  <Table.Column allowsSorting id="isActive">
                    {({ sortDirection }) => (
                      <SortableColumnHeader sortDirection={sortDirection}>Status</SortableColumnHeader>
                    )}
                  </Table.Column>
                )}
                {visibleColumns.has("assignments") && (
                  <Table.Column id="assignments">
                    Assignments
                  </Table.Column>
                )}
                {visibleColumns.has("mobile") && (
                  <Table.Column id="mobile">
                    Mobile
                  </Table.Column>
                )}
                <Table.Column className="text-end">Actions</Table.Column>
              </Table.Header>
              <Table.Body>
                {paginatedFaculty.map((emp) => (
                  <Table.Row key={emp.id} id={emp.id}>
                    {/* Code */}
                    {visibleColumns.has("facultyCode") && (
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold tabular-nums">
                            {emp.facultyCode}
                          </span>
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
                      </Table.Cell>
                    )}

                    {/* Member */}
                    {visibleColumns.has("name") && (
                      <Table.Cell>
                        <div className="flex items-center gap-3">
                          
                          <span className="text-xs font-medium">{emp.name}</span>
                        </div>
                      </Table.Cell>
                    )}

                    {/* Designation */}
                    {visibleColumns.has("designation") && (
                      <Table.Cell>{emp.designation || "—"}</Table.Cell>
                    )}

                    {/* Status */}
                    {visibleColumns.has("isActive") && (
                      <Table.Cell>
                        <Chip size="sm" variant="soft" color={emp.isActive ? "success" : "danger"}>
                          {emp.isActive ? "Active" : "Inactive"}
                        </Chip>
                      </Table.Cell>
                    )}

                    {/* Assignments */}
                    {visibleColumns.has("assignments") && (
                      <Table.Cell>
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
                      </Table.Cell>
                    )}

                    {/* Mobile */}
                    {visibleColumns.has("mobile") && (
                      <Table.Cell>
                        <span className="tabular-nums text-xs text-foreground/80">{emp.mobile}</span>
                      </Table.Cell>
                    )}

                    {/* Actions */}
                    <Table.Cell>
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
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>

      {/* Pagination */}
      {mounted && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full pt-1.5 min-w-0">
          <Pagination size="sm" className="w-full flex-col sm:flex-row gap-2">
            <Pagination.Summary>
              Showing {startItem}-{endItem} of {sortedFaculty.length} results
            </Pagination.Summary>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous
                  isDisabled={page === 1}
                  onPress={() => setPage((p) => p - 1)}
                >
                  <Pagination.PreviousIcon />
                  <span className="hidden sm:inline">Previous</span>
                </Pagination.Previous>
              </Pagination.Item>
              {getPageNumbers().map((p, i) =>
                p === "ellipsis" ? (
                  <Pagination.Item key={`ellipsis-${i}`}>
                    <Pagination.Ellipsis />
                  </Pagination.Item>
                ) : (
                  <Pagination.Item key={p}>
                    <Pagination.Link
                      isActive={p === page}
                      onPress={() => setPage(p as number)}
                    >
                      {p}
                    </Pagination.Link>
                  </Pagination.Item>
                )
              )}
              <Pagination.Item>
                <Pagination.Next
                  isDisabled={page === totalPages || sortedFaculty.length === 0}
                  onPress={() => setPage((p) => p + 1)}
                >
                  <span className="hidden sm:inline">Next</span>
                  <Pagination.NextIcon />
                </Pagination.Next>
              </Pagination.Item>
            </Pagination.Content>
          </Pagination>
        </div>
      )}
    </div>
  );
}
