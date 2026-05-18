"use client";
// ─────────────────────────────────────────────────────────────────────────────
// Manual Timetable Builder — Main Page
// ERP-style manual timetable editor: click cells → assign lectures
// All data in localStorage, zero API calls during editing.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Select,
  ListBox,
  Card,
  Chip,
  Tooltip,
  Spinner,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useDataContext } from "@/contexts/DataContext";
import type {
  ManualTimetableCell,
  ManualTimetableStore,
  MasterData,
  TimetableConflict,
} from "@/lib/types/manual-timetable";
import {
  loadMasterData,
  saveMasterData,
  loadTimetable,
  updateCell,
  clearCell,
  copyCell,
  clearClassTimetable,
  clearAllTimetables,
  createEmptyStore,
  ensureClass,
  calculateAllConflicts,
  saveTimetable,
} from "@/lib/manual-timetable-store";
import ManualTimetableGrid from "./ManualTimetableGrid";
import CellAssignmentModal from "./CellAssignmentModal";

export default function TimetableBuilderPage() {
  const { courseId, courses } = useDataContext();

  // ─── Core state ────────────────────────────────────────────────────
  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [store, setStore] = useState<ManualTimetableStore | null>(null);
  const [conflicts, setConflicts] = useState<TimetableConflict[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDay, setModalDay] = useState("");
  const [modalSlot, setModalSlot] = useState("");

  // ─── Load from localStorage on mount ───────────────────────────────
  useEffect(() => {
    const md = loadMasterData();
    if (md) setMasterData(md);
    const tt = loadTimetable();
    if (tt) {
      setStore(tt);
      setConflicts(calculateAllConflicts(tt));
    }
  }, []);

  // ─── Auto-select first class when master data changes ──────────────
  useEffect(() => {
    if (masterData && masterData.classes.length > 0 && !selectedClassId) {
      setSelectedClassId(String(masterData.classes[0].id));
    }
  }, [masterData, selectedClassId]);

  // ─── Course name ───────────────────────────────────────────────────
  const courseName = useMemo(
    () => courses.find((c) => c.id === courseId)?.name || "Course",
    [courses, courseId]
  );

  // ─── Filtered classes (from master data) ───────────────────────────
  const classList = useMemo(
    () => masterData?.classes ?? [],
    [masterData]
  );

  // ─── Current class details ─────────────────────────────────────────
  const selectedClass = useMemo(
    () => classList.find((c) => String(c.id) === selectedClassId) || null,
    [classList, selectedClassId]
  );

  // ─── Current grid for selected class ───────────────────────────────
  const currentGrid = useMemo(() => {
    if (!store || !selectedClassId) return null;
    const cId = Number(selectedClassId);
    return store.timetables[cId]?.grid ?? null;
  }, [store, selectedClassId]);

  // ─── Cell in the currently active modal position ───────────────────
  const existingCell = useMemo<ManualTimetableCell | null>(() => {
    if (!currentGrid || !modalDay || !modalSlot) return null;
    return currentGrid[modalDay]?.[modalSlot] ?? null;
  }, [currentGrid, modalDay, modalSlot]);

  // ─── Conflicts for current class ───────────────────────────────────
  const classConflicts = useMemo(
    () => (selectedClassId ? conflicts.filter((c) => c.classId === Number(selectedClassId)) : []),
    [conflicts, selectedClassId]
  );

  // ─── Subject lecture counts for current class ──────────────────────
  const subjectCounts = useMemo(() => {
    if (!currentGrid) return [];
    // Track: for each subject, count unique lectures
    // Consecutive lab slots on the same day for the same subject count as 1
    const counts = new Map<string, { code: string; count: number }>();
    for (const dayKey of ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]) {
      const daySlots = currentGrid[dayKey];
      if (!daySlots) continue;
      let prevSubjectCode: string | null = null;
      let prevWasLab = false;
      for (let s = 1; s <= 5; s++) {
        const cell = daySlots[`lecture${s}`];
        if (!cell) {
          prevSubjectCode = null;
          prevWasLab = false;
          continue;
        }
        // If this is a lab and same subject as previous lab slot → skip (consecutive lab)
        const isContinuation =
          cell.isLabSession &&
          prevWasLab &&
          cell.subjectShortCode === prevSubjectCode;
        if (!isContinuation) {
          const existing = counts.get(cell.subjectShortCode);
          if (existing) {
            existing.count++;
          } else {
            counts.set(cell.subjectShortCode, { code: cell.subjectShortCode, count: 1 });
          }
        }
        prevSubjectCode = cell.subjectShortCode;
        prevWasLab = cell.isLabSession;
      }
    }
    return Array.from(counts.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [currentGrid]);

  // ─── Fetch Fresh handler ───────────────────────────────────────────
  const handleFetchFresh = useCallback(async () => {
    if (!courseId) return;
    setIsFetching(true);
    setFetchError(null);
    try {
      // 1. Fetch ERP Master Data
      const resMaster = await fetch(`/api/timetable/generation-data?courseId=${courseId}`);
      if (!resMaster.ok) {
        const err = await resMaster.json().catch(() => ({ error: "Network error" }));
        throw new Error(err.error || `HTTP ${resMaster.status}`);
      }
      const data: MasterData = await resMaster.json();
      saveMasterData(data);
      setMasterData(data);

      // 2. Fetch saved timetable from DB
      const resTt = await fetch(`/api/timetable?courseId=${courseId}`);
      if (!resTt.ok) {
        throw new Error("Failed to fetch saved timetable");
      }
      const dbEntries = await resTt.json();

      // 3. Reconstruct store
      let newStore = createEmptyStore(courseId, data.metadata.courseName);
      
      // Initialize grids for all classes first
      for (const c of data.classes) {
        newStore = ensureClass(newStore, c.id, c.name);
      }

      // Create lookup maps for quick access
      const subjectMap = new Map(data.subjects.map(s => [s.id, s]));
      const facultyMap = new Map(data.faculties.map(f => [f.id, f]));
      const labMap = new Map(data.rooms.filter(r => r.isLab).map(r => [r.id, r]));

      // Populate grid with saved DB entries
      for (const entry of dbEntries) {
        const cId = entry.classId;
        if (newStore.timetables[cId]) {
          const subject = entry.subjectId ? subjectMap.get(entry.subjectId) : null;
          const faculty = entry.facultyId ? facultyMap.get(entry.facultyId) : null;
          const lab = entry.labId ? labMap.get(entry.labId) : null;

          if (entry.isQuiz) {
            newStore.timetables[cId].grid[entry.day][entry.slot] = {
              assignmentId: null,
              subjectId: null,
              subjectShortCode: "QUIZ",
              subjectName: "Quiz",
              subjectType: "Quiz",
              facultyId: null,
              facultyCode: null,
              facultyName: null,
              isLabSession: false,
              labId: null,
              labName: null,
              isQuiz: true,
            };
          } else if (subject && faculty) {
            newStore.timetables[cId].grid[entry.day][entry.slot] = {
              assignmentId: entry.assignmentId,
              subjectId: entry.subjectId,
              subjectShortCode: subject.shortCode,
              subjectName: subject.name,
              subjectType: subject.type,
              facultyId: entry.facultyId,
              facultyCode: faculty.code,
              facultyName: faculty.name,
              isLabSession: entry.isLabSession,
              labId: entry.labId,
              labName: lab?.name || null,
              isQuiz: false,
            };
          }
        }
      }

      saveTimetable(newStore);
      setStore(newStore);
      setConflicts(calculateAllConflicts(newStore));

      // Auto-select first class
      if (data.classes.length > 0) {
        setSelectedClassId(String(data.classes[0].id));
      }
    } catch (err: any) {
      setFetchError(err?.message || "Failed to fetch data");
    } finally {
      setIsFetching(false);
    }
  }, [courseId]);

  // ─── Save Timetable handler ────────────────────────────────────────
  const handleSaveTimetable = useCallback(async () => {
    if (!store || !courseId) return;
    setIsSaving(true);
    try {
      const entries = [];
      for (const ct of Object.values(store.timetables)) {
        for (const [day, slots] of Object.entries(ct.grid)) {
          for (const [slot, cell] of Object.entries(slots)) {
            if (cell) {
              entries.push({
                classId: ct.classId,
                day,
                slot,
                assignmentId: cell.assignmentId,
                subjectId: cell.subjectId,
                facultyId: cell.facultyId,
                isLabSession: cell.isLabSession,
                labId: cell.labId,
                isQuiz: cell.isQuiz ?? false,
              });
            }
          }
        }
      }
      
      const res = await fetch("/api/timetable/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, entries })
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save timetable");
      }
      
      alert("✅ Timetable saved successfully");
    } catch (err: any) {
      alert("⚠ " + (err.message || "Failed to save timetable"));
    } finally {
      setIsSaving(false);
    }
  }, [store, courseId]);

  // ─── Publish to ERP handler ────────────────────────────────────────
  const handlePublishToERP = useCallback(async () => {
    if (!store || !masterData) return;
    if (!window.confirm("Publish all class timetables to the live ERP system?")) return;
    setIsPublishing(true);
    try {
      const groupMap = new Map<string, any>();

      for (const ct of Object.values(store.timetables)) {
        for (const [day, slots] of Object.entries(ct.grid)) {
          for (const [slot, cell] of Object.entries(slots)) {
            if (cell) {
              const classCode = ct.className;
              const facultyCode = cell.facultyCode || "QUIZ";
              const subject = cell.subjectId ? masterData.subjects.find(s => s.id === cell.subjectId) : null;
              const subjectCode = subject ? subject.code : cell.subjectShortCode;
              
              const key = `${classCode}_${facultyCode}_${subjectCode}`;

              if (!groupMap.has(key)) {
                groupMap.set(key, {
                  classCode,
                  facultyCode,
                  subjectCode,
                  lectures: []
                });
              }

              // Extract slot number from 'lecture1', 'lecture2', etc.
              const slotNumber = parseInt(slot.replace('lecture', ''), 10);
              
              const lectureData: any = {
                day: day.toUpperCase(),
                slot: slotNumber,
              };

              if (cell.isLabSession && cell.labName) {
                lectureData.lab = cell.labName;
              }

              groupMap.get(key).lectures.push(lectureData);
            }
          }
        }
      }

      const payload = Array.from(groupMap.values());
      
      const res = await fetch("http://localhost:3000/api/integration/timetable/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer dev-ims-secret"
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        console.error("Validation Errors:", json.validationErrors);
        let errorDetails = "";
        if (json.validationErrors && Array.isArray(json.validationErrors)) {
          errorDetails = "\n\nDetails:\n" + json.validationErrors.map((err: any) => {
             if (err.message) return `- ${err.message}`;
             return `- ${JSON.stringify(err)}`;
          }).join("\n");
        }
        throw new Error(json.message + errorDetails);
      }

      alert("🚀 Timetable successfully published to ERP!");
      
    } catch (err: any) {
      alert("❌ Publish failed: " + err.message);
    } finally {
      setIsPublishing(false);
    }
  }, [store, masterData]);

  // ─── Cell click → open modal ───────────────────────────────────────
  const handleCellClick = useCallback((day: string, slot: string) => {
    setModalDay(day);
    setModalSlot(slot);
    setModalOpen(true);
  }, []);

  // ─── Cell clear ────────────────────────────────────────────────────
  const handleCellClear = useCallback(
    (day: string, slot: string) => {
      if (!store || !selectedClassId) return;
      const cId = Number(selectedClassId);
      const updated = clearCell(store, cId, day, slot);
      setStore(updated);
      setConflicts(calculateAllConflicts(updated));
    },
    [store, selectedClassId]
  );

  // ─── Cell move (drag-and-drop swap) ────────────────────────────────
  const handleCellMove = useCallback(
    (fromDay: string, fromSlot: string, toDay: string, toSlot: string) => {
      if (!store || !selectedClassId) return;
      const cId = Number(selectedClassId);
      const updated = copyCell(store, cId, fromDay, fromSlot, toDay, toSlot);
      setStore(updated);
      setConflicts(calculateAllConflicts(updated));
    },
    [store, selectedClassId]
  );

  // ─── Assign from modal ────────────────────────────────────────────
  const handleAssign = useCallback(
    (cell: ManualTimetableCell) => {
      if (!store || !selectedClassId || !selectedClass) return;
      const cId = Number(selectedClassId);
      let s = ensureClass(store, cId, selectedClass.name);
      s = updateCell(s, cId, selectedClass.name, modalDay, modalSlot, cell);
      setStore(s);
      setConflicts(calculateAllConflicts(s));
    },
    [store, selectedClassId, selectedClass, modalDay, modalSlot]
  );

  // ─── Clear class timetable ────────────────────────────────────────
  const handleClearClass = useCallback(() => {
    if (!store || !selectedClassId) return;
    if (!window.confirm(`Clear entire timetable for ${selectedClass?.name || "this class"}?`)) return;
    const updated = clearClassTimetable(store, Number(selectedClassId));
    setStore(updated);
    setConflicts(calculateAllConflicts(updated));
  }, [store, selectedClassId, selectedClass]);

  // ─── Clear ALL timetables ─────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    if (!store) return;
    if (!window.confirm("Clear ALL timetables for all classes? This cannot be undone.")) return;
    const updated = clearAllTimetables(store);
    setStore(updated);
    setConflicts(calculateAllConflicts(updated));
  }, [store]);

  // ─── Export Excel ──────────────────────────────────────────────────
  const handleExportExcel = useCallback(async () => {
    if (!store || !masterData) return;
    try {
      const { exportTimetableToExcel } = await import("@/lib/export-excel");
      await exportTimetableToExcel(store, masterData);
    } catch (err: any) {
      console.error(err);
      alert("Failed to export Excel: " + err.message);
    }
  }, [store, masterData]);

  // ─── Empty grid for display (when class has no timetable yet) ──────
  const displayGrid = useMemo(() => {
    if (currentGrid) return currentGrid;
    // Create empty display grid
    const g: Record<string, Record<string, null>> = {};
    for (const d of ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]) {
      g[d] = {};
      for (let s = 1; s <= 5; s++) g[d][`lecture${s}`] = null;
    }
    return g;
  }, [currentGrid]);

  // ─── Conflict summary counts ───────────────────────────────────────
  const totalConflicts = conflicts.length;
  const facultyConflicts = conflicts.filter((c) => c.type === "faculty").length;
  const labConflicts = conflicts.filter((c) => c.type === "lab").length;

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">Timetable Builder</h1>
          <p className="text-sm text-muted mt-0.5">
            Manually assign lectures — conflicts detected in realtime
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Conflict Summary */}
          {totalConflicts > 0 && (
            <Tooltip>
              <Tooltip.Trigger>
                <Chip size="sm" variant="soft" color="danger" className="cursor-default">
                  <Icon icon="gravity-ui:triangle-exclamation-fill" width={12} />
                  <span className="ml-1">{totalConflicts / 2} conflict{totalConflicts / 2 !== 1 ? "s" : ""}</span>
                </Chip>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <div className="info-tooltip space-y-1">
                  <div>Faculty: {facultyConflicts / 2}</div>
                  <div>Lab: {labConflicts / 2}</div>
                  <div className="text-[10px] text-muted mt-1">Conflicts are warnings — you can still save.</div>
                </div>
              </Tooltip.Content>
            </Tooltip>
          )}

          {store && (
            <>
              <Button size="sm" variant="secondary" onPress={handleExportExcel} isDisabled={!masterData}>
                <Icon icon="gravity-ui:file-arrow-down" width={14} />
                Save as Excel
              </Button>
              <Button size="sm" variant="secondary" onPress={handleClearClass} isDisabled={!selectedClassId}>
                <Icon icon="gravity-ui:trash-bin" width={14} />
                Clear Class
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="secondary"
            onPress={handleFetchFresh}
            isPending={isFetching}
            isDisabled={!courseId || isSaving}
          >
            {({ isPending }) => (
              <>
                {isPending ? (
                  <Spinner color="current" size="sm" />
                ) : (
                  <Icon icon="gravity-ui:arrows-rotate-right" width={14} />
                )}
                <span className="ml-1">{isPending ? "Fetching…" : "Fetch Fresh"}</span>
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="primary"
            onPress={handleSaveTimetable}
            isPending={isSaving}
            isDisabled={!courseId || isFetching || !store}
          >
            {({ isPending }) => (
              <>
                {isPending ? (
                  <Spinner color="current" size="sm" />
                ) : (
                  <Icon icon="gravity-ui:floppy-disk" width={14} />
                )}
                <span className="ml-1">{isPending ? "Saving…" : "Save Timetable"}</span>
              </>
            )}
          </Button>

          <Button
            size="sm"
            // color="success"
            variant="primary"
            onPress={handlePublishToERP}
            isPending={isPublishing}
            isDisabled={!courseId || isFetching || !store}
          >
            {({ isPending }) => (
              <>
                {isPending ? (
                  <Spinner color="current" size="sm" />
                ) : (
                  <Icon icon="gravity-ui:rocket" width={14} />
                )}
                <span className="ml-1">{isPending ? "Publishing…" : "Publish to ERP"}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Fetch Error ── */}
      {fetchError && (
        <div className="mb-4 p-3 rounded-lg bg-danger/5 border border-danger/20 text-sm text-danger">
          {fetchError}
        </div>
      )}

      {/* ── No Data State ── */}
      {!masterData && (
        <Card className="text-center py-16">
          <Card.Content>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/10 flex items-center justify-center">
              <Icon icon="gravity-ui:database" width={32} className="text-accent" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No Data Loaded</h2>
            <p className="text-sm text-muted mb-6 max-w-md mx-auto">
              Click <strong>Fetch Fresh</strong> to load master data for{" "}
              <strong>{courseName}</strong>. After fetching, the builder works entirely offline.
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="secondary"
                size="lg"
                onPress={handleFetchFresh}
                isDisabled={!courseId || isFetching || isSaving}
              >
                <Icon icon="gravity-ui:arrows-rotate-right" width={18} />
                {isFetching ? "Fetching..." : "Fetch Fresh"}
              </Button>
              <Button
                variant="primary"
                size="lg"
                onPress={handleSaveTimetable}
                isDisabled={!courseId || isFetching || isSaving || !store}
              >
                <Icon icon="gravity-ui:floppy-disk" width={18} />
                {isSaving ? "Saving..." : "Save Timetable"}
              </Button>
            </div>
            <div className="mt-4 flex justify-center">
              <Button
                variant="primary"
                size="lg"
                onPress={handlePublishToERP}
                isDisabled={!courseId || isFetching || isSaving || !store}
              >
                <Icon icon="gravity-ui:rocket" width={18} />
                {isPublishing ? "Publishing..." : "Publish to ERP"}
              </Button>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* ── Builder UI ── */}
      {masterData && (
        <div>
          {/* Class Filter Row */}
          <div className="flex items-center gap-3 mb-4">
            <Select
              className="w-[240px]"
              aria-label="Select class"
              selectedKey={selectedClassId || undefined}
              onSelectionChange={(key) => {
                if (key !== null) setSelectedClassId(String(key));
              }}
              placeholder="Select a class…"
            >
              <Select.Trigger className="h-9 text-sm">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {classList.map((c) => (
                    <ListBox.Item key={String(c.id)} id={String(c.id)} textValue={c.name}>
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-[10px] text-muted font-mono">
                          Sem {c.semester} · Div {c.divisionNumber}
                        </span>
                      </div>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            {classConflicts.length > 0 && (
              <Chip size="sm" variant="soft" color="warning">
                <Icon icon="gravity-ui:triangle-exclamation" width={12} />
                <span className="ml-1">{classConflicts.length} warning{classConflicts.length !== 1 ? "s" : ""} in this class</span>
              </Chip>
            )}

            {store && (
              <div className="ml-auto text-xs text-muted">
                Last modified: {new Date(store.lastModified).toLocaleString()}
              </div>
            )}
          </div>

          {/* Subject Lecture Counts */}
          {subjectCounts.length > 0 && (
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              <span className="text-[11px] text-muted font-medium mr-1">Assigned:</span>
              {subjectCounts.map((s) => (
                <Chip key={s.code} size="sm" variant="soft" className="text-[11px] h-5 px-1.5">
                  {s.code} <strong className="ml-0.5">{s.count}</strong>
                </Chip>
              ))}
            </div>
          )}

          {/* Timetable Grid */}
          {selectedClass ? (
            <ManualTimetableGrid
              grid={displayGrid}
              conflicts={conflicts}
              classId={Number(selectedClassId)}
              title={selectedClass.name}
              onCellClick={handleCellClick}
              onCellClear={handleCellClear}
              onCellMove={handleCellMove}
            />
          ) : (
            <Card className="text-center py-10">
              <Card.Content>
                <p className="text-sm text-muted">Select a class to start building its timetable.</p>
              </Card.Content>
            </Card>
          )}

          {/* Footer info */}
          <div className="mt-4 flex items-center gap-6 text-xs text-muted">
            <span>Click a cell to assign</span>
            <span>•</span>
            <span>Drag to copy</span>
            <span>•</span>
            <span>Delete/Backspace to clear</span>
            <span>•</span>
            <span>All data in localStorage</span>
            <span>•</span>
            <span>{courseName} · {classList.length} classes</span>
          </div>
        </div>
      )}

      {/* ── Cell Assignment Modal ── */}
      {masterData && store && selectedClass && (
        <CellAssignmentModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onAssign={handleAssign}
          masterData={masterData}
          store={store}
          classId={Number(selectedClassId)}
          className={selectedClass.name}
          day={modalDay}
          slot={modalSlot}
          existingCell={existingCell}
        />
      )}
    </div>
  );
}
