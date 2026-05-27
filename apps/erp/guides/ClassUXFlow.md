# Classroom Layout Designer UX & Flow

## 1. Overview

The Classroom Layout Designer allows the HOD/Admin to visually create and manage classroom bench layouts used for future examination seating generation.

The system is designed for operational simplicity and fast editing. Since classroom structures are mostly grid-based and semi-structured, the layout editor avoids unnecessary drag-and-drop complexity.

The designer focuses on:

* Fast classroom setup
* Minimal manual effort
* Easy editing of irregular layouts
* Clear visual structure
* Reusable classroom templates

---

# 2. Initial Classroom Setup Flow

## Step 1 — Create Classroom

The HOD/Admin creates a classroom by entering:

| Field            | Example      |
| ---------------- | ------------ |
| Room Code        | `G1`         |
| Floor            | `Ground`     |
| Building         | `Main Block` |
| Lecture Capacity | `80`         |

After classroom creation, the admin proceeds to the layout designer.

---

# 3. Initial Layout Generation

## 3.1 Auto-Generate Layout

To avoid manually creating every bench, the system provides an automatic layout generator.

The admin enters:

| Field                  | Example |
| ---------------------- | ------- |
| Number of Rows         | `10`    |
| Number of Columns      | `3`     |
| Default Bench Capacity | `2`     |

The system automatically generates the initial layout.

### Example Generated Layout

```txt
A1 A2 A3
B1 B2 B3
C1 C2 C3
```

Bench labels are automatically generated sequentially.

---

# 4. Layout Editing System

## 4.1 Grid-Based Editing

The layout editor uses a structured grid system rather than freeform dragging.

Each grid position contains either:

* A bench
* Or an empty add slot

Example:

```txt
[+] [+] [+]

[]  []  []

[]      []

[+] [+] [+]
```

---

## 4.2 Adding Benches

Empty positions display a `+` button.

When the admin clicks the `+` button:

* A new bench is created
* The bench receives an automatic label
* The default bench capacity is applied
* The layout updates immediately

The system also keeps additional empty slots around the layout so new rows or columns can easily be extended later.

---

## 4.3 Removing Benches

Each bench contains a delete action.

Deleting a bench removes it from the layout and creates an empty slot in its place.

This allows irregular classroom structures such as:

```txt
[] [] []

[]     []

[] [] []
```

---

# 5. Bench Configuration

## 5.1 Bench Capacity

Each bench contains a configurable maximum student capacity.

The admin can directly change the capacity for any bench individually.

Supported capacities:

* 1 Student
* 2 Students
* 3 Students
* 4 Students

Example:

| Bench | Capacity |
| ----- | -------- |
| A1    | 2        |
| A2    | 3        |
| B1    | 4        |

---

## 5.2 Bench Labels

Bench labels such as `A1`, `A2`, `B3` are automatically generated and maintained by the system.

These labels are used for:

* Seating charts
* Invigilator instructions
* Student seat lookup
* Examination reports
* PDF exports

---

# 6. Copy Layout Feature

## 6.1 Purpose

Many classrooms share similar or identical physical layouts.

To reduce repetitive manual setup, the system provides a "Copy Layout From" feature.

---

## 6.2 Workflow

While creating or editing a classroom layout, the admin can select:

```txt
Copy Layout From:
[G1 ▼]
```

The system duplicates:

* Bench positions
* Bench capacities
* Bench structure
* Grid layout

The admin can then make small modifications as needed.

This significantly reduces setup time for large institutions.

---

# 7. Layout Rendering Rules

## 7.1 Grid Coordinates

Bench positions are stored using logical grid coordinates:

| Field    | Description         |
| -------- | ------------------- |
| `grid_x` | Horizontal position |
| `grid_y` | Vertical position   |

Example:

| Label | grid_x | grid_y |
| ----- | ------ | ------ |
| A1    | 0      | 0      |
| A2    | 1      | 0      |
| B1    | 0      | 1      |

This approach simplifies:

* Rendering
* Layout generation
* Seating algorithms
* Querying
* Export generation

---

# 8. Automatic Capacity Calculations

The system automatically calculates:

| Metric                    | Description                         |
| ------------------------- | ----------------------------------- |
| Total Benches             | Total benches in layout             |
| Active Benches            | Enabled benches only                |
| Physical Seating Capacity | Sum of all bench capacities         |
| Estimated Exam Capacity   | Dynamic exam-based seating estimate |

The examination seating capacity is not manually entered and depends on future anti-cheating allocation rules.

---

# 9. Design Principles

* The layout system prioritizes operational simplicity over design complexity.
* Freeform drag-and-drop positioning is intentionally avoided.
* Grid-based editing ensures predictable rendering and easier seating generation.
* Classroom layouts support irregular real-world structures.
* Bench creation should require minimal manual effort.
* Empty slots must always allow future expansion of rows and columns.
* Layout duplication should minimize repetitive administrative work.
* Examination seating logic remains independent from the physical classroom infrastructure layer.

