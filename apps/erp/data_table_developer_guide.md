# DataTable Developer Guide

The `DataTable` component is the standardized table interface for our HeroUI dashboard. It is a polymorphic wrapper designed to handle either **Client-Side (Local)** data slicing and sorting, or **Server-Side (Controlled)** API-driven pagination, sorting, and search.

---

## ─── Core Architecture & Props ──────────────────────────────────────────

The component is declared in [data-table.tsx](file:///p:/02_projects/mono/apps/erp/components/data-table.tsx) and supports the following props:

### Prop Signature Interface
```typescript
interface TableColumnDef {
  name: string;
  uid: string;
  allowsSorting?: boolean;
  isRowHeader?: boolean;
  className?: string; // Custom Tailwind width or padding classes
}

interface DataTableProps<T> {
  // Data and Schema
  data: T[];
  columns: TableColumnDef[];
  initialVisibleColumns?: string[];
  title?: string;
  
  // Custom Renderers
  renderCell: (item: T, columnKey: string) => React.ReactNode;
  getRowClassName?: (item: T) => string;
  emptyStateMessage?: string;
  
  // Loading & Error States
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  refetch?: () => void;
  
  // Persistence & Features
  localStorageKey?: string; // Optional: persists visible column choices
  selectionMode?: "none" | "single" | "multiple";
  selectedKeys?: Selection;
  onSelectionChange?: (keys: Selection) => void;
  toolbarActions?: React.ReactNode; // Content inserted next to columns selector
  
  // Search Configuration
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[]; // Required for Client-Side local filtering
  searchQuery?: string;     // Required for Server-Side controlled filtering
  onSearchQueryChange?: (query: string) => void;

  // Pagination & Sorting Modes
  serverSide?: boolean;
  page?: number;
  onPageChange?: (page: number) => void;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onItemsPerPageChange?: (limit: number) => void;
  sortDescriptor?: SortDescriptor;
  onSortChange?: (descriptor: SortDescriptor) => void;
}
```

---

## ─── Usage Modes ───────────────────────────────────────────────────────

### 1. Client-Side (Local) Pagination & Filtering
In this mode, the API returns a complete list of records (e.g. all 100 faculty members), and `DataTable` handles pagination, text search, sorting, and column visibility filters entirely in-memory.

> [!TIP]
> Use Client-Side mode for moderate datasets (less than 1,000 items) where server-side roundtrips for basic sorting and search are unnecessary.

#### Implementation Example:
```tsx
import { DataTable, type TableColumnDef } from "@/components/data-table";

const COLUMNS: TableColumnDef[] = [
  { name: "Code", uid: "code", allowsSorting: true },
  { name: "Name", uid: "name", allowsSorting: true },
  { name: "Designation", uid: "designation" },
];

export function FacultyTable() {
  const { data, isLoading } = useFacultyListQuery({ limit: 1000 }); // Fetch all

  const renderCell = (item: Faculty, columnKey: string) => {
    if (columnKey === "name") return <strong>{item.name}</strong>;
    return item[columnKey];
  };

  return (
    <DataTable
      data={data?.faculty || []}
      columns={COLUMNS}
      initialVisibleColumns={["code", "name"]}
      searchKeys={["name", "code"]} // Fields to look up during search queries
      searchPlaceholder="Search faculty..."
      renderCell={renderCell}
      localStorageKey="faculty_table_columns" // Persists visibility
      isLoading={isLoading}
    />
  );
}
```

---

### 2. Server-Side (Controlled) API-Driven Mode
For large datasets or database-driven pagination, you must set `serverSide={true}`. In this mode, the local sorting, filtering, and slicing logics are disabled, and the table serves as a pure visual presenter. The parent component owns the pagination and search states and maps them directly to your API query hooks.

> [!IMPORTANT]
> When `serverSide={true}` is enabled, you MUST provide: `page`, `totalPages`, `totalItems`, `itemsPerPage`, `sortDescriptor`, `searchQuery`, and their corresponding callback handlers (`onPageChange`, `onItemsPerPageChange`, `onSortChange`, `onSearchQueryChange`).

#### Implementation Example (Integrating with TanStack Query):
```tsx
import { useState, useMemo } from "react";
import { DataTable } from "@/components/data-table";
import { useNotificationsQuery } from "@/app/lib/queries/notifications";

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortDescriptor>({ column: "createdAt", direction: "descending" });

  // 1. Memoize parameters passed to the TanStack Query hook
  const queryParams = useMemo(() => ({
    limit,
    offset: (page - 1) * limit,
    search: search || undefined,
  }), [page, limit, search]);

  const { data, isLoading } = useNotificationsQuery(queryParams);
  const totalPages = Math.ceil((data?.pagination.total || 0) / limit) || 1;

  // 2. Perform client-side order matching on the paginated slice returned by API
  const sortedItems = useMemo(() => {
    const list = [...(data?.notifications || [])];
    return list.sort((a, b) => {
      let first = a[sort.column];
      let second = b[sort.column];
      let cmp = first < second ? -1 : first > second ? 1 : 0;
      return sort.direction === "descending" ? -cmp : cmp;
    });
  }, [data?.notifications, sort]);

  return (
    <DataTable
      serverSide
      data={sortedItems}
      columns={COLUMNS}
      searchPlaceholder="Search alerts..."
      searchQuery={search}
      onSearchQueryChange={(query) => {
        setSearch(query);
        setPage(1); // Reset page on new search
      }}
      page={page}
      onPageChange={setPage}
      totalPages={totalPages}
      totalItems={data?.pagination.total || 0}
      itemsPerPage={limit}
      onItemsPerPageChange={(newLimit) => {
        setLimit(newLimit);
        setPage(1); // Reset page on limit change
      }}
      sortDescriptor={sort}
      onSortChange={(desc) => {
        setSort(desc);
        setPage(1);
      }}
      renderCell={renderCell}
      isLoading={isLoading}
    />
  );
}
```

---

## ─── Layout Styling & Customization ──────────────────────────────────────

### 1. Highlight Rows Dynamically (`getRowClassName`)
To draw attention to specific rows (e.g. unread notifications, high-priority actions, or disabled entities), pass the `getRowClassName` callback. This is cleaner than injecting style overrides inside the individual cells.

```tsx
const getRowClassName = (notification: Notification) => {
  return `transition-colors hover:bg-default-50/50 ${
    !notification.isRead ? "bg-primary/5 hover:bg-primary/10" : ""
  }`;
};
```

### 2. Multi-Row Selection & Bulk Operations
Enable selection using `selectionMode="multiple"` and bind standard state variables to `selectedKeys` and `onSelectionChange`.

```tsx
const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());

// Displaying bulk actions banner when selection size > 0
const selectedCount = selectedKeys === "all" ? items.length : selectedKeys.size;
```

### 3. Cohesive Action Buttons in the Toolbar (`toolbarActions`)
Any custom buttons or filter dropdowns placed on the table toolbar should match the built-in control elements (like `Rows: 10` or `Columns`).

> [!WARNING]
> Always use `variant="tertiary"` and `size="sm"` for toolbar actions. Avoid using `variant="outline"` or `variant="secondary"`, as this leads to inconsistent button backgrounds.

#### Correct Pattern:
```tsx
toolbarActions={
  <Dropdown>
    <Button variant="tertiary" size="sm">
      Status: {filterStatus}
      <ChevronDown className="size-3.5 ml-1" />
    </Button>
    <Dropdown.Popover>
      ...
    </Dropdown.Popover>
  </Dropdown>
}
```
