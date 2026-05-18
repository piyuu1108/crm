"use client";
// ─────────────────────────────────────────────────────────────────────────────
// Faculty Schedule — Shows per-faculty timetable occupancy from localStorage
// Reads `manual_timetable` + `erp_master_data` from Timetable Builder.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button, Select, Label, ListBox, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { loadTimetable, loadMasterData } from "@/lib/manual-timetable-store";
import type { ManualTimetableStore, ManualTimetableCell } from "@/lib/types/manual-timetable";
import type { MasterData } from "@/lib/types/manual-timetable";
import { DAY_KEYS, SLOTS_PER_DAY, slotKey } from "@/lib/types/manual-timetable";

interface FacultyOption {
  id: number;
  code: string;
  name: string;
}

interface FacultySlotEntry {
  className: string;
  subjectCode: string;
  subjectName: string;
  isLab: boolean;
  labName: string | null;
}

const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

export default function FacultySchedulePage() {
  const [store, setStore] = useState<ManualTimetableStore | null>(null);
  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | undefined>(undefined);

  // ─── Load from localStorage ────────────────────────────────────────
  const refreshData = useCallback(() => {
    setStore(loadTimetable());
    setMasterData(loadMasterData());
  }, []);

  useEffect(() => {
    refreshData();
    // Cross-tab sync
    const handler = (e: StorageEvent) => {
      if (e.key === "manual_timetable" || e.key === "erp_master_data") refreshData();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [refreshData]);

  // ─── Export Excel ──────────────────────────────────────────────────
  const handleExportExcel = useCallback(async () => {
    if (!store || !masterData) return;
    try {
      const { exportFacultyScheduleToExcel } = await import("@/lib/export-excel");
      await exportFacultyScheduleToExcel(store, masterData);
    } catch (err: any) {
      console.error(err);
      alert("Failed to export Excel: " + err.message);
    }
  }, [store, masterData]);

  // ─── Build faculty list from master data ───────────────────────────
  const facultyList = useMemo<FacultyOption[]>(() => {
    if (!masterData) return [];
    // Use unique faculties from master data
    const map = new Map<number, FacultyOption>();
    for (const f of masterData.faculties) {
      map.set(f.id, { id: f.id, code: f.code, name: f.name });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [masterData]);

  // Auto-select first faculty
  useEffect(() => {
    if (facultyList.length > 0 && !selectedFacultyId) {
      setSelectedFacultyId(String(facultyList[0].id));
    }
  }, [facultyList, selectedFacultyId]);

  // ─── Build faculty timetable grid from localStorage ────────────────
  const facultyGrid = useMemo(() => {
    if (!store || !selectedFacultyId) return null;
    const fId = parseInt(selectedFacultyId, 10);

    // grid[slotIdx][dayIdx] → entry | null
    const grid: (FacultySlotEntry | null)[][] = [];

    for (let s = 1; s <= SLOTS_PER_DAY; s++) {
      const row: (FacultySlotEntry | null)[] = [];
      for (const dayKey of DAY_KEYS) {
        let found: FacultySlotEntry | null = null;
        for (const ct of Object.values(store.timetables)) {
          const cell: ManualTimetableCell | null = ct.grid[dayKey]?.[slotKey(s)] ?? null;
          if (cell && cell.facultyId === fId) {
            found = {
              className: ct.className,
              subjectCode: cell.subjectShortCode,
              subjectName: cell.subjectName,
              isLab: cell.isLabSession,
              labName: cell.labName,
            };
            // Don't break — but first match is fine (one faculty per slot per class ideally)
            break;
          }
        }
        row.push(found);
      }
      grid.push(row);
    }
    return grid;
  }, [store, selectedFacultyId]);

  // ─── Stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!facultyGrid) return { total: 0, occupied: 0, labs: 0 };
    const total = facultyGrid.length * DAY_KEYS.length;
    let occupied = 0;
    let labs = 0;
    for (const row of facultyGrid) {
      for (const cell of row) {
        if (cell) {
          occupied++;
          if (cell.isLab) labs++;
        }
      }
    }
    return { total, occupied, labs };
  }, [facultyGrid]);

  // ─── Unique Classes for Selected Faculty ───────────────────────────
  const uniqueClasses = useMemo(() => {
    if (!facultyGrid) return [];
    const classes = new Set<string>();
    for (const row of facultyGrid) {
      for (const cell of row) {
        if (cell?.className) {
          classes.add(cell.className);
        }
      }
    }
    return Array.from(classes).sort();
  }, [facultyGrid]);

  const [highlightedClass, setHighlightedClass] = useState<string | null>(null);

  // Reset highlight when selected faculty changes
  useEffect(() => {
    setHighlightedClass(null);
  }, [selectedFacultyId]);

  const selectedFaculty = facultyList.find((f) => String(f.id) === selectedFacultyId);
  const hasStore = store !== null;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold">Faculty Schedule</h1>
          <p className="text-sm text-muted mt-1">
            View per-faculty timetable from Timetable Builder (localStorage)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {masterData && store && (
            <Button size="sm" variant="secondary" onPress={handleExportExcel}>
              <Icon icon="gravity-ui:file-arrow-down" width={14} />
              Save as Excel
            </Button>
          )}
          <Button size="sm" variant="secondary" onPress={refreshData}>
            <Icon icon="gravity-ui:arrows-rotate-right" width={14} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Faculty Selector */}
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div className="w-full sm:w-[300px]">
          <Select
            className="w-full"
            aria-label="Select Faculty"
            selectedKey={selectedFacultyId}
            onSelectionChange={(key) => {
              if (key !== null) setSelectedFacultyId(String(key));
            }}
            placeholder="Select a faculty..."
            isDisabled={facultyList.length === 0}
          >
            <Label>Select Faculty</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {facultyList.map((f) => (
                  <ListBox.Item
                    key={String(f.id)}
                    id={String(f.id)}
                    textValue={`${f.name} (${f.code})`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-sm">{f.name}</span>
                      <span className="text-[10px] text-muted font-mono">{f.code}</span>
                    </div>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        {/* Stats */}
        {selectedFaculty && facultyGrid && (
          <div className="sm:ml-auto flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Chip size="sm" variant="soft" color={stats.occupied > 0 ? "accent" : "default"}>
              {stats.occupied}/{stats.total} slots
            </Chip>
            {stats.labs > 0 && (
              <Chip size="sm" variant="soft" color="success">
                {stats.labs} lab{stats.labs !== 1 ? "s" : ""}
              </Chip>
            )}
          </div>
        )}
      </div>

      {/* No data warning */}
      {!hasStore && (
        <div className="mb-4 p-3 rounded-lg bg-warning-light border border-warning/20 text-sm text-warning flex items-center gap-2">
          <Icon icon="gravity-ui:triangle-exclamation" width={16} />
          <span>
            No timetable data in localStorage. Use the{" "}
            <strong>Timetable Builder</strong> → <strong>Fetch Fresh</strong> first.
          </span>
        </div>
      )}

      {/* Unique Classes Chips Series */}
      {selectedFaculty && uniqueClasses.length > 0 && (
        <div className="mb-6 p-4 bg-white border border-border rounded-xl shadow-sm flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-accent-light/35 text-accent flex items-center justify-center">
                <Icon icon="gravity-ui:shield-check" width={16} />
              </span>
              <span className="text-sm font-semibold text-primary">Classes Scheduled for this Faculty</span>
            </div>
            {highlightedClass && (
              <Button
                size="sm"
                variant="tertiary"
                className="h-7 text-xs text-muted hover:text-danger hover:bg-danger-light/10"
                onPress={() => setHighlightedClass(null)}
              >
                Clear Highlight
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {uniqueClasses.map((cls) => {
              const isHighlighted = highlightedClass === cls;
              return (
                <Chip
                  key={cls}
                  size="sm"
                  variant={isHighlighted ? "primary" : "soft"}
                  color={isHighlighted ? "accent" : "default"}
                  className="cursor-pointer transition-all hover:scale-105 active:scale-95"
                  onClick={() => setHighlightedClass(isHighlighted ? null : cls)}
                >
                  <Chip.Label>{cls}</Chip.Label>
                </Chip>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid */}
      {facultyList.length === 0 ? (
        <div className="text-center py-12 text-muted text-sm border border-dashed border-border rounded-lg">
          No faculty data available. Fetch master data from the Timetable Builder first.
        </div>
      ) : !selectedFacultyId ? (
        <div className="text-center py-12 text-muted text-sm border border-dashed border-border rounded-lg">
          Select a faculty above to view their schedule.
        </div>
      ) : !facultyGrid ? (
        <div className="text-center py-12 text-muted text-sm border border-dashed border-border rounded-lg">
          No timetable data available.
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse">
              <thead>
                <tr>
                  <th className="w-28 px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider bg-surface-alt border-b border-r border-border sticky left-0 z-10">
                    Slot
                  </th>
                  {DAY_KEYS.map((dayKey) => (
                    <th
                      key={dayKey}
                      className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider bg-surface-alt border-b border-r border-border last:border-r-0"
                    >
                      {DAY_LABELS[dayKey]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {facultyGrid.map((row, rowIdx) => (
                  <tr key={rowIdx} className="group">
                    <td className="px-4 py-3 font-semibold text-sm text-muted bg-surface-alt border-b border-r border-border sticky left-0 z-10">
                      Lecture {rowIdx + 1}
                    </td>
                    {row.map((cell, colIdx) => {
                      const isHighlighted = highlightedClass
                        ? cell?.className === highlightedClass
                        : false;
                      const hasHighlightActive = highlightedClass !== null;

                      return (
                        <td
                          key={colIdx}
                          className={`px-3 py-3 border-b border-r border-border last:border-r-0 align-top h-[76px] transition-all duration-200 ${
                            isHighlighted
                              ? "bg-accent-light/35 ring-2 ring-accent ring-inset"
                              : hasHighlightActive
                              ? "opacity-35"
                              : `group-hover:bg-surface-alt/30 ${cell?.isLab ? "bg-accent/5" : ""}`
                          }`}
                        >
                          {cell ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-sm text-primary">
                                {cell.className}
                              </span>
                              <span className="text-xs text-muted">
                                {cell.subjectCode}
                              </span>
                              {cell.isLab && cell.labName && (
                                <span className="text-[10px] font-medium text-accent">
                                  🔬 {cell.labName}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full text-xs text-muted/40 italic select-none">
                              —
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 text-xs text-muted">
        Data source: <strong>localStorage</strong> (manual_timetable) · Click <strong>Refresh</strong> to reload
      </div>
    </div>
  );
}
