"use client";
// ─────────────────────────────────────────────────────────────────────────────
// Lab Schedule — Shows lab occupancy grid built from Timetable Builder localStorage
// Lab CRUD still via API; timetable grid reads from `manual_timetable` localStorage.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button, Modal, TextField, Label, Input, Select, ListBox, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { ErrorAlert } from "@/components/ui/Alerts";
import { loadTimetable } from "@/lib/manual-timetable-store";
import type { ManualTimetableStore } from "@/lib/types/manual-timetable";
import { DAY_KEYS, SLOTS_PER_DAY, slotKey } from "@/lib/types/manual-timetable";

interface Lab {
  id: number;
  name: string;
}

interface LabSlotEntry {
  className: string;
  subjectCode: string;
  subjectName: string;
  facultyCode: string;
}

const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

export default function LabSchedulePage() {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<string | undefined>(undefined);
  const [store, setStore] = useState<ManualTimetableStore | null>(null);

  // Modal state for inline add/edit
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Lab | null>(null);
  const [formName, setFormName] = useState("");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // ─── Load labs from API ────────────────────────────────────────────
  useEffect(() => {
    fetchLabs();
  }, []);

  // ─── Load timetable from localStorage ──────────────────────────────
  const refreshStore = useCallback(() => {
    setStore(loadTimetable());
  }, []);

  useEffect(() => {
    refreshStore();
    // Listen for localStorage changes from timetable builder (cross-tab)
    const handler = (e: StorageEvent) => {
      if (e.key === "manual_timetable") refreshStore();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [refreshStore]);

  // ─── Build lab occupancy grid from localStorage store ──────────────
  const labGrid = useMemo(() => {
    if (!store || !selectedLabId) return null;
    const labId = parseInt(selectedLabId, 10);

    // grid[slotNum][dayKey] → LabSlotEntry | null
    const grid: (LabSlotEntry | null)[][] = [];

    for (let s = 1; s <= SLOTS_PER_DAY; s++) {
      const row: (LabSlotEntry | null)[] = [];
      for (const dayKey of DAY_KEYS) {
        let found: LabSlotEntry | null = null;
        // Scan all classes for this day+slot using this lab
        for (const ct of Object.values(store.timetables)) {
          const cell = ct.grid[dayKey]?.[slotKey(s)];
          if (cell && cell.isLabSession && cell.labId === labId) {
            found = {
              className: ct.className,
              subjectCode: cell.subjectShortCode,
              subjectName: cell.subjectName,
              facultyCode: cell.facultyCode!,
            };
            break; // one lab can only be in one class per slot
          }
        }
        row.push(found);
      }
      grid.push(row);
    }
    return grid;
  }, [store, selectedLabId]);

  // ─── Stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!labGrid) return { total: 0, occupied: 0 };
    const total = labGrid.length * DAY_KEYS.length;
    let occupied = 0;
    for (const row of labGrid) {
      for (const cell of row) {
        if (cell) occupied++;
      }
    }
    return { total, occupied };
  }, [labGrid]);

  // ─── Unique Classes in Selected Lab ────────────────────────────────
  const uniqueClasses = useMemo(() => {
    if (!labGrid) return [];
    const classes = new Set<string>();
    for (const row of labGrid) {
      for (const cell of row) {
        if (cell?.className) {
          classes.add(cell.className);
        }
      }
    }
    return Array.from(classes).sort();
  }, [labGrid]);

  const [highlightedClass, setHighlightedClass] = useState<string | null>(null);

  // Reset highlight when selected lab changes
  useEffect(() => {
    setHighlightedClass(null);
  }, [selectedLabId]);

  // ─── Lab API operations ────────────────────────────────────────────
  const fetchLabs = async () => {
    try {
      const res = await fetch("/api/labs");
      if (res.ok) {
        const data = await res.json();
        setLabs(data);
        if (data.length > 0 && !selectedLabId) {
          setSelectedLabId(String(data[0].id));
        }
      }
    } catch (err) {
      console.error("Failed to fetch labs", err);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setFormName("");
    setFormError("");
    setShowModal(true);
  };

  const openEdit = () => {
    if (!selectedLabId) return;
    const lab = labs.find((l) => String(l.id) === selectedLabId);
    if (!lab) return;
    setEditing(lab);
    setFormName(lab.name);
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    setFormError("");
    if (!formName.trim()) {
      setFormError("Lab name is required");
      return;
    }
    setFormLoading(true);
    try {
      const url = editing ? `/api/labs/${editing.id}` : "/api/labs";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error);
        return;
      }
      const savedLab = await res.json();
      await fetchLabs();
      if (!editing) {
        setSelectedLabId(String(savedLab.id));
      }
      setShowModal(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedLabId) return;
    if (!confirm("Delete this Lab? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/labs/${selectedLabId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete");
        return;
      }
      setSelectedLabId(undefined);
      await fetchLabs();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const selectedLab = labs.find((l) => String(l.id) === selectedLabId);
  const hasStore = store !== null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Lab Schedule</h1>
          <p className="text-sm text-muted mt-1">
            View lab occupancy from Timetable Builder (localStorage)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onPress={refreshStore}>
            <Icon icon="gravity-ui:arrows-rotate-right" width={14} />
            Refresh
          </Button>
          <Button size="sm" onPress={openAdd}>
            <Icon icon="gravity-ui:plus" width={14} /> Add LAB
          </Button>
        </div>
      </div>

      {/* Lab Selector + Actions */}
      <div className="flex items-end gap-3 mb-6">
        <div className="w-[260px]">
          <Select
            className="w-full"
            aria-label="Select LAB"
            selectedKey={selectedLabId}
            onSelectionChange={(key) => {
              if (key !== null) setSelectedLabId(String(key));
            }}
            placeholder="Select a Lab..."
            isDisabled={labs.length === 0}
          >
            <Label>Select LAB</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {labs.map((lab) => (
                  <ListBox.Item
                    key={String(lab.id)}
                    id={String(lab.id)}
                    textValue={lab.name}
                  >
                    {lab.name}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        {selectedLab && (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onPress={openEdit}>
              <Icon icon="gravity-ui:pencil" width={14} /> Edit
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="hover:text-danger hover:border-danger/30"
              onPress={handleDelete}
            >
              <Icon icon="gravity-ui:trash-bin" width={14} /> Delete
            </Button>
          </div>
        )}

        {/* Occupancy stats */}
        {selectedLab && labGrid && (
          <div className="ml-auto flex items-center gap-2">
            <Chip size="sm" variant="soft" color={stats.occupied > 0 ? "accent" : "default"}>
              {stats.occupied}/{stats.total} slots occupied
            </Chip>
          </div>
        )}
      </div>

      {/* No data warning */}
      {!hasStore && labs.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-warning-light border border-warning/20 text-sm text-warning flex items-center gap-2">
          <Icon icon="gravity-ui:triangle-exclamation" width={16} />
          <span>
            No timetable data in localStorage. Use the{" "}
            <strong>Timetable Builder</strong> → <strong>Fetch Fresh</strong> first.
          </span>
        </div>
      )}

      {/* Unique Classes Chips Series */}
      {selectedLab && uniqueClasses.length > 0 && (
        <div className="mb-6 p-4 bg-white border border-border rounded-xl shadow-sm flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-accent-light/35 text-accent flex items-center justify-center">
                <Icon icon="gravity-ui:shield-check" width={16} />
              </span>
              <span className="text-sm font-semibold text-primary">Classes Scheduled in this Lab</span>
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

      {/* Timetable Grid */}
      {labs.length === 0 ? (
        <div className="text-center py-12 text-muted text-sm border border-dashed border-border rounded-lg">
          No labs created yet. Add a lab to view its schedule.
        </div>
      ) : !selectedLabId ? (
        <div className="text-center py-12 text-muted text-sm border border-dashed border-border rounded-lg">
          Select a lab above to view its timetable.
        </div>
      ) : !labGrid ? (
        <div className="text-center py-12 text-muted text-sm border border-dashed border-border rounded-lg">
          No timetable data available. Build timetables first.
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
                {labGrid.map((row, rowIdx) => (
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
                              : "group-hover:bg-surface-alt/30"
                          }`}
                        >
                          {cell ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-sm text-primary">
                                {cell.className}
                              </span>
                              <span className="text-xs text-muted">
                                {cell.subjectCode}
                                {cell.facultyCode ? ` (${cell.facultyCode})` : ""}
                              </span>
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

      {/* Add/Edit LAB Modal */}
      <Modal.Backdrop isOpen={showModal} onOpenChange={setShowModal}>
        <Modal.Container placement="center">
          <Modal.Dialog className="sm:max-w-sm">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>
                {editing ? "Edit LAB" : "Add LAB"}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <ErrorAlert message={formError} className="mb-4" />
              <TextField
                name="labName"
                isRequired
                value={formName}
                onChange={(v) => setFormName(v)}
              >
                <Label>LAB Name</Label>
                <Input placeholder="e.g. LAB-1" autoFocus />
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onPress={() => setShowModal(false)}
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onPress={handleSave}
                isDisabled={formLoading}
                size="sm"
              >
                {formLoading
                  ? "Saving..."
                  : editing
                  ? "Update"
                  : "Create"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
