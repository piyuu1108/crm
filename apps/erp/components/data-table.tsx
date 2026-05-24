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
  Checkbox,
  type SortDescriptor,
  type Selection,
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
  toolbarActions?: React.ReactNode;
  emptyStateMessage?: string;
  selectionMode?: "none" | "single" | "multiple";
  selectedKeys?: Selection;
  onSelectionChange?: (keys: Selection) => void;
  onRowAction?: (key: React.Key) => void;
  getRowClassName?: (item: T) => string;

  // Controlled/Server-side Pagination & Sorting props
  serverSide?: boolean;
  page?: number;
  onPageChange?: (page: number) => void;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onItemsPerPageChange?: (limit: number) => void;
  sortDescriptor?: SortDescriptor;
  onSortChange?: (descriptor: SortDescriptor) => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
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
  toolbarActions,
  emptyStateMessage,
  selectionMode,
  selectedKeys,
  onSelectionChange,
  onRowAction,
  getRowClassName,

  // Controlled props
  serverSide = false,
  page: pageProp,
  onPageChange,
  totalPages: totalPagesProp,
  totalItems: totalItemsProp,
  itemsPerPage: itemsPerPageProp,
  onItemsPerPageChange,
  sortDescriptor: sortDescriptorProp,
  onSortChange,
  searchQuery: searchQueryProp,
  onSearchQueryChange,
}: ReusableTableProps<T>) {
  const [mounted, setMounted] = React.useState(false);

  // Local state as fallbacks
  const [localSearchQuery, setLocalSearchQuery] = React.useState("");
  const [localPage, setLocalPage] = React.useState(1);
  const [localItemsPerPage, setLocalItemsPerPage] = React.useState(10);
  const [localSortDescriptor, setLocalSortDescriptor] = React.useState<SortDescriptor>({
    column: columns[0]?.uid || "",
    direction: "ascending",
  });

  const [visibleColumns, setVisibleColumns] = React.useState<Set<string>>(
    new Set(initialVisibleColumns)
  );

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

  // Derived values depending on serverSide vs clientSide
  const searchVal = serverSide ? (searchQueryProp ?? "") : localSearchQuery;
  const pageVal = serverSide ? (pageProp ?? 1) : localPage;
  const itemsPerPageVal = serverSide ? (itemsPerPageProp ?? 10) : localItemsPerPage;
  const sortDescVal = serverSide ? (sortDescriptorProp ?? { column: "", direction: "ascending" }) : localSortDescriptor;

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
    if (serverSide) {
      onSortChange?.(descriptor);
      onPageChange?.(1);
    } else {
      setLocalSortDescriptor(descriptor);
      setLocalPage(1);
    }

    const colName = columns.find((c) => c.uid === descriptor.column)?.name || descriptor.column;
    toast.info(`Sorting by ${colName} (${descriptor.direction === "ascending" ? "ascending" : "descending"})`);
  };

  const handleSearchChange = (query: string) => {
    if (serverSide) {
      onSearchQueryChange?.(query);
      onPageChange?.(1);
    } else {
      setLocalSearchQuery(query);
      setLocalPage(1);
    }
  };

  const handlePageChange = (p: number) => {
    if (serverSide) {
      onPageChange?.(p);
    } else {
      setLocalPage(p);
    }
  };

  const handleItemsPerPageChange = (limit: number) => {
    if (serverSide) {
      onItemsPerPageChange?.(limit);
      onPageChange?.(1);
    } else {
      setLocalItemsPerPage(limit);
      setLocalPage(1);
    }
  };

  const filteredData = React.useMemo(() => {
    if (serverSide) return data;
    if (!searchVal || !searchKeys || searchKeys.length === 0) return data;

    const q = searchVal.toLowerCase();
    return data.filter((item) =>
      searchKeys.some((key) => {
        const val = item[key];
        if (val === undefined || val === null) return false;
        return String(val).toLowerCase().includes(q);
      })
    );
  }, [data, searchVal, searchKeys, serverSide]);

  const sortedData = React.useMemo(() => {
    if (serverSide) return data;
    const list = [...filteredData];
    if (sortDescVal.column) {
      list.sort((a, b) => {
        const val1 = a[sortDescVal.column as keyof typeof a];
        const val2 = b[sortDescVal.column as keyof typeof b];

        if (Array.isArray(val1) || Array.isArray(val2)) {
          const len1 = Array.isArray(val1) ? val1.length : 0;
          const len2 = Array.isArray(val2) ? val2.length : 0;
          const cmp = len1 < len2 ? -1 : len1 > len2 ? 1 : 0;
          return sortDescVal.direction === "descending" ? -cmp : cmp;
        }

        const v1 = (val1 ?? "") as any;
        const v2 = (val2 ?? "") as any;

        let cmp = 0;
        if (typeof v1 === "string" && typeof v2 === "string") {
          cmp = v1.localeCompare(v2);
        } else {
          cmp = v1 < v2 ? -1 : v1 > v2 ? 1 : 0;
        }
        return sortDescVal.direction === "descending" ? -cmp : cmp;
      });
    }
    return list;
  }, [filteredData, sortDescVal, serverSide]);

  const totalPagesVal = serverSide ? (totalPagesProp ?? 1) : Math.max(1, Math.ceil(sortedData.length / itemsPerPageVal));
  const totalItemsVal = serverSide ? (totalItemsProp ?? data.length) : sortedData.length;

  const paginatedData = React.useMemo(() => {
    if (serverSide) return data;
    return sortedData.slice(
      (pageVal - 1) * itemsPerPageVal,
      pageVal * itemsPerPageVal
    );
  }, [sortedData, pageVal, itemsPerPageVal, serverSide, data]);

  const startItem = totalItemsVal === 0 ? 0 : (pageVal - 1) * itemsPerPageVal + 1;
  const endItem = Math.min(pageVal * itemsPerPageVal, totalItemsVal);

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPagesVal <= 3) {
      for (let i = 1; i <= totalPagesVal; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (pageVal <= 2) {
        pages.push(2);
        pages.push("ellipsis");
        pages.push(totalPagesVal);
      } else if (pageVal >= totalPagesVal - 1) {
        pages.push("ellipsis");
        pages.push(totalPagesVal - 1);
        pages.push(totalPagesVal);
      } else {
        pages.push("ellipsis");
        pages.push(pageVal);
        pages.push("ellipsis");
        pages.push(totalPagesVal);
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
        {(title || totalItemsVal > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {title && (
              <span className="text-base font-semibold text-foreground">
                {title}
              </span>
            )}
            <Chip size="sm" variant="soft">{totalItemsVal}</Chip>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SearchField
            aria-label={searchPlaceholder}
            className="w-full sm:w-[280px] md:w-[360px]"
            value={searchVal}
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
                Rows: {itemsPerPageVal}
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  aria-label="Rows per page"
                  selectionMode="single"
                  selectedKeys={new Set([String(itemsPerPageVal)])}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    if (selected) {
                      handleItemsPerPageChange(Number(selected));
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
            {toolbarActions}
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
              sortDescriptor={sortDescVal}
              onSortChange={(desc) => handleSortChange(desc as any)}
              selectionMode={selectionMode}
              selectedKeys={selectedKeys}
              onSelectionChange={onSelectionChange}
              onRowAction={onRowAction}
            >
              <Table.Header>
                {selectionMode === "multiple" && (
                  <Table.Column className="w-[44px]">
                    <Checkbox aria-label="Select all rows" slot="selection">
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                    </Checkbox>
                  </Table.Column>
                )}
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
              <Table.Body
                renderEmptyState={() => (
                  <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                    {emptyStateMessage || "No records found."}
                  </div>
                )}
              >
                {paginatedData.map((item) => (
                  <Table.Row
                    key={item.id}
                    id={item.id}
                    className={getRowClassName ? getRowClassName(item) : undefined}
                  >
                    {selectionMode === "multiple" && (
                      <Table.Cell>
                        <Checkbox
                          aria-label="Select row"
                          slot="selection"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                        </Checkbox>
                      </Table.Cell>
                    )}
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
              Showing {startItem}-{endItem} of {totalItemsVal} results
            </Pagination.Summary>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous
                  isDisabled={pageVal === 1}
                  onPress={() => handlePageChange(pageVal - 1)}
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
                      isActive={p === pageVal}
                      onPress={() => handlePageChange(p as number)}
                    >
                      {p}
                    </Pagination.Link>
                  </Pagination.Item>
                )
              )}
              <Pagination.Item>
                <Pagination.Next
                  isDisabled={pageVal === totalPagesVal || totalItemsVal === 0}
                  onPress={() => handlePageChange(pageVal + 1)}
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
