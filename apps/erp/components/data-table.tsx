"use client";

import * as React from "react";
import {
  Table,
  Button,
  SearchField,
  Dropdown,
  Label,
  Pagination,
  toast,
  Spinner,
  Chip,
  type SortDescriptor,
} from "@heroui/react";
import { ArrowDownUp, Columns3, ChevronUp } from "lucide-react";

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

export interface TableColumnDef {
  name: string;
  uid: string;
  allowsSorting?: boolean;
  isRowHeader?: boolean;
  className?: string;
}

interface ReusableTableProps<T extends { id: string | number }> {
  data: T[];
  columns: TableColumnDef[];
  initialVisibleColumns: string[];
  searchKeys?: (keyof T)[];
  searchPlaceholder?: string;
  renderCell: (item: T, columnKey: string) => React.ReactNode;
  localStorageKey?: string;
  title?: string;
  isLoading?: boolean;
  isError?: boolean;
  error?: any;
  refetch?: () => void;
}

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  initialVisibleColumns,
  searchKeys,
  searchPlaceholder = "Search...",
  renderCell,
  localStorageKey,
  title,
  isLoading,
  isError,
  error,
  refetch,
}: ReusableTableProps<T>) {
  const [mounted, setMounted] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  const [visibleColumns, setVisibleColumns] = React.useState<Set<string>>(
    new Set(initialVisibleColumns)
  );

  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: columns[0]?.uid || "",
    direction: "ascending",
  });

  React.useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Columns visibility persistence
  React.useEffect(() => {
    if (localStorageKey) {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setVisibleColumns(new Set(parsed));
          }
        } catch (e) {}
      }
    }
  }, [localStorageKey]);

  const handleColumnSelectionChange = (keys: any) => {
    if (keys === "all") {
      const allKeys = columns.map((c) => c.uid);
      setVisibleColumns(new Set(allKeys));
      if (localStorageKey) {
        localStorage.setItem(localStorageKey, JSON.stringify(allKeys));
      }
      return;
    }
    const newKeys = Array.from(keys) as string[];
    setVisibleColumns(new Set(newKeys));
    if (localStorageKey) {
      localStorage.setItem(localStorageKey, JSON.stringify(newKeys));
    }
  };

  const handleSortChange = (descriptor: SortDescriptor) => {
    setSortDescriptor(descriptor);
    setPage(1);

    const colName = columns.find((c) => c.uid === descriptor.column)?.name || descriptor.column;
    toast.info(`Sorting by ${colName} (${descriptor.direction === "ascending" ? "ascending" : "descending"})`);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  const filteredData = React.useMemo(() => {
    if (!searchQuery || !searchKeys || searchKeys.length === 0) return data;

    const q = searchQuery.toLowerCase();
    return data.filter((item) =>
      searchKeys.some((key) => {
        const val = item[key];
        if (val === undefined || val === null) return false;
        return String(val).toLowerCase().includes(q);
      })
    );
  }, [data, searchQuery, searchKeys]);

  const sortedData = React.useMemo(() => {
    const list = [...filteredData];
    if (sortDescriptor.column) {
      list.sort((a, b) => {
        const val1 = a[sortDescriptor.column as keyof typeof a];
        const val2 = b[sortDescriptor.column as keyof typeof b];

        if (Array.isArray(val1) || Array.isArray(val2)) {
          const len1 = Array.isArray(val1) ? val1.length : 0;
          const len2 = Array.isArray(val2) ? val2.length : 0;
          const cmp = len1 < len2 ? -1 : len1 > len2 ? 1 : 0;
          return sortDescriptor.direction === "descending" ? -cmp : cmp;
        }

        const v1 = (val1 ?? "") as any;
        const v2 = (val2 ?? "") as any;

        let cmp = 0;
        if (typeof v1 === "string" && typeof v2 === "string") {
          cmp = v1.localeCompare(v2);
        } else {
          cmp = v1 < v2 ? -1 : v1 > v2 ? 1 : 0;
        }
        return sortDescriptor.direction === "descending" ? -cmp : cmp;
      });
    }
    return list;
  }, [filteredData, sortDescriptor]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const paginatedData = sortedData.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const startItem = sortedData.length === 0 ? 0 : (page - 1) * itemsPerPage + 1;
  const endItem = Math.min(page * itemsPerPage, sortedData.length);

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
        <p className="text-xs text-muted-foreground">Loading data...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <p className="text-sm font-semibold text-danger">Failed to load data</p>
        <p className="text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "An unexpected error occurred"}
        </p>
        {refetch && (
          <Button size="sm" variant="tertiary" onPress={() => refetch()}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Title / Header */}
      <div className="flex flex-col gap-3">
        {(title || sortedData.length > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {title && (
              <span className="text-base font-semibold text-foreground">
                {title}
              </span>
            )}
            <Chip size="sm" variant="soft">{sortedData.length}</Chip>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SearchField
            aria-label={searchPlaceholder}
            className="w-full sm:w-[280px] md:w-[360px]"
            value={searchQuery}
            onChange={handleSearchChange}
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={searchPlaceholder} />
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
                  {columns.map((column) => (
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
              aria-label={title || "Data table"}
              className="min-w-[700px]"
              sortDescriptor={sortDescriptor}
              onSortChange={(desc) => handleSortChange(desc as any)}
            >
              <Table.Header>
                {columns.map(
                  (col) =>
                    visibleColumns.has(col.uid) && (
                      <Table.Column
                        key={col.uid}
                        id={col.uid}
                        isRowHeader={col.isRowHeader}
                        allowsSorting={col.allowsSorting}
                        className={col.className}
                      >
                        {col.allowsSorting
                          ? ({ sortDirection }) => (
                              <SortableColumnHeader sortDirection={sortDirection}>
                                {col.name}
                              </SortableColumnHeader>
                            )
                          : col.name}
                      </Table.Column>
                    )
                )}
              </Table.Header>
              <Table.Body>
                {paginatedData.map((item) => (
                  <Table.Row key={item.id} id={item.id}>
                    {columns.map(
                      (col) =>
                        visibleColumns.has(col.uid) && (
                          <Table.Cell key={col.uid}>
                            {renderCell(item, col.uid)}
                          </Table.Cell>
                        )
                    )}
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
              Showing {startItem}-{endItem} of {sortedData.length} results
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
                  isDisabled={page === totalPages || sortedData.length === 0}
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
