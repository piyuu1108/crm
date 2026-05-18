"use client";
// ─────────────────────────────────────────────────────────────────────────────
// CellAssignmentModal — Select subject (with auto-mapped faculty) + optional lab
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { Button, Modal, Select, ListBox, Switch, Label, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import type {
  ManualTimetableCell,
  MasterData,
  TimetableConflict,
  ManualTimetableStore,
} from "@/lib/types/manual-timetable";
import { DAY_LABELS } from "@/lib/types/manual-timetable";
import { previewConflicts } from "@/lib/manual-timetable-store";
import type { GenLectureRequirement, GenRoom } from "@/lib/types/generation";

interface CellAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (cell: ManualTimetableCell) => void;
  masterData: MasterData;
  store: ManualTimetableStore;
  classId: number;
  className: string;
  day: string;
  slot: string;
  /** If editing an existing cell, pre-populate */
  existingCell: ManualTimetableCell | null;
}

export default function CellAssignmentModal({
  isOpen,
  onClose,
  onAssign,
  masterData,
  store,
  classId,
  className,
  day,
  slot,
  existingCell,
}: CellAssignmentModalProps) {
  // ─── State ─────────────────────────────────────────────────────────
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [isLab, setIsLab] = useState(false);
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);

  // ─── Reset on open / cell change ───────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      if (existingCell) {
        setSelectedAssignmentId(
          existingCell.isQuiz
            ? "QUIZ"
            : existingCell.assignmentId !== null
            ? String(existingCell.assignmentId)
            : null
        );
        setIsLab(existingCell.isLabSession);
        setSelectedLabId(existingCell.labId !== null ? String(existingCell.labId) : null);
      } else {
        setSelectedAssignmentId(null);
        setIsLab(false);
        setSelectedLabId(null);
      }
    }
  }, [isOpen, existingCell]);

  // ─── Derived data ──────────────────────────────────────────────────

  /** Assignments available for this class */
  const classAssignments = useMemo<GenLectureRequirement[]>(
    () => masterData.assignments.filter((a) => a.classId === classId),
    [masterData.assignments, classId]
  );

  /** Labs (rooms with isLab = true) */
  const labRooms = useMemo<GenRoom[]>(
    () => masterData.rooms.filter((r) => r.isLab),
    [masterData.rooms]
  );

  /** Selected assignment details */
  const selectedAssignment = useMemo(
    () =>
      selectedAssignmentId && selectedAssignmentId !== "QUIZ"
        ? classAssignments.find((a) => a.assignmentId === Number(selectedAssignmentId)) || null
        : null,
    [selectedAssignmentId, classAssignments]
  );

  /** Should show lab toggle? */
  const canBeLab = useMemo(
    () =>
      selectedAssignment
        ? selectedAssignment.subjectType === "Practical" ||
          selectedAssignment.subjectType === "Both"
        : false,
    [selectedAssignment]
  );

  // Reset lab toggle when subject changes
  useEffect(() => {
    if (!canBeLab) {
      setIsLab(false);
      setSelectedLabId(null);
    }
  }, [canBeLab]);

  /** Build the cell object for preview / saving */
  const builtCell = useMemo<ManualTimetableCell | null>(() => {
    if (selectedAssignmentId === "QUIZ") {
      return {
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
    }
    if (!selectedAssignment) return null;
    const lab = isLab && selectedLabId ? labRooms.find((r) => r.id === Number(selectedLabId)) : null;
    return {
      assignmentId: selectedAssignment.assignmentId,
      subjectId: selectedAssignment.subjectId,
      subjectShortCode: selectedAssignment.subjectShortCode,
      subjectName: selectedAssignment.subjectName,
      subjectType: selectedAssignment.subjectType,
      facultyId: selectedAssignment.facultyId,
      facultyCode: selectedAssignment.facultyCode,
      facultyName: selectedAssignment.facultyName,
      isLabSession: isLab,
      labId: lab ? lab.id : null,
      labName: lab ? lab.name : null,
      isQuiz: false,
    };
  }, [selectedAssignmentId, selectedAssignment, isLab, selectedLabId, labRooms]);

  /** Live conflict preview */
  const liveConflicts = useMemo<TimetableConflict[]>(() => {
    if (!builtCell) return [];
    return previewConflicts(store, classId, className, day, slot, builtCell);
  }, [builtCell, store, classId, className, day, slot]);

  /** Split conflicts by type for inline display */
  const labConflicts = useMemo(
    () => liveConflicts.filter((c) => c.type === "lab"),
    [liveConflicts]
  );
  const facultyConflicts = useMemo(
    () => liveConflicts.filter((c) => c.type === "faculty"),
    [liveConflicts]
  );

  // ─── Handlers ──────────────────────────────────────────────────────

  const handleAssign = () => {
    if (!builtCell) return;
    onAssign(builtCell);
    onClose();
  };

  // ─── Slot display label ────────────────────────────────────────────
  const slotNum = parseInt(slot.replace("lecture", ""), 10);
  const slotDisplay = `Lecture ${slotNum}`;
  const dayDisplay = DAY_LABELS[day] || day;

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-md">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>
              Assign Lecture
            </Modal.Heading>
            <div className="flex items-center gap-2 mt-1">
              <Chip size="sm" variant="soft" color="accent">{dayDisplay}</Chip>
              <Chip size="sm" variant="soft">{slotDisplay}</Chip>
              <Chip size="sm" variant="soft">{className}</Chip>
            </div>
          </Modal.Header>
          <Modal.Body>
            <div className="space-y-4">
              {/* Subject Selector */}
              <div>
                <Label className="text-xs font-medium text-muted mb-1.5 block">
                  Subject — Faculty
                </Label>
                <Select
                  aria-label="Select subject"
                  selectedKey={selectedAssignmentId || undefined}
                  onSelectionChange={(key) => {
                    if (key !== null) setSelectedAssignmentId(String(key));
                  }}
                  className="w-full"
                  placeholder="Select a subject…"
                >
                  <Select.Trigger className="h-10 text-sm">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {classAssignments.map((a) => (
                        <ListBox.Item
                          key={String(a.assignmentId)}
                          id={String(a.assignmentId)}
                          textValue={`${a.subjectShortCode} - ${a.facultyName}`}
                        >
                          <div className="flex items-center justify-between w-full gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{a.subjectShortCode}</span>
                              <span className="text-xs text-muted">— {a.facultyName}</span>
                            </div>
                            <span className="text-[10px] font-mono text-muted/60">
                              {a.subjectType === "Both" ? "T+P" : a.subjectType === "Practical" ? "P" : "T"}
                            </span>
                          </div>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                      <ListBox.Item
                        key="QUIZ"
                        id="QUIZ"
                        textValue="Quiz"
                      >
                        <div className="flex items-center justify-between w-full gap-2 py-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-amber-600">📝 Generic Quiz Session</span>
                          </div>
                          <span className="text-[10px] font-bold text-amber-600/80 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            QUIZ
                          </span>
                        </div>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>

              {/* Quiz info when selected */}
              {selectedAssignmentId === "QUIZ" && (
                <div className="bg-surface-alt rounded-lg border border-amber-200/60 bg-amber-50/20 p-3 space-y-1.5">
                  <div className="text-sm font-semibold text-amber-700 flex items-center gap-1.5">
                    <Icon icon="gravity-ui:shield-check" width={16} />
                    <span>Generic Quiz Session</span>
                  </div>
                  <p className="text-xs text-muted">
                    This slot will be scheduled as a Quiz. It does not require any specific subject, faculty, or lab, and can be placed anywhere without conflicts.
                  </p>
                </div>
              )}

              {/* Subject info when selected */}
              {selectedAssignment && (
                <div className={`bg-surface-alt rounded-lg border p-3 space-y-1.5 ${facultyConflicts.length > 0 ? "border-danger/50" : "border-border/50"}`}>
                  <div className="text-sm font-medium">{selectedAssignment.subjectName}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Chip
                      size="sm"
                      variant="soft"
                      color={selectedAssignment.subjectType === "Theory" ? "accent" : selectedAssignment.subjectType === "Practical" ? "success" : "warning"}
                      className="text-[10px]"
                    >
                      {selectedAssignment.subjectType === "Both" ? "Theory + Practical" : selectedAssignment.subjectType}
                    </Chip>
                    <span className="text-xs text-muted">
                      Credit: {selectedAssignment.subjectCredit}
                    </span>
                    <span className="text-xs text-muted">
                      Faculty: <strong>{selectedAssignment.facultyCode}</strong>
                    </span>
                  </div>
                  {/* Inline faculty conflict warning */}
                  {facultyConflicts.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-danger mt-1">
                      <Icon icon="gravity-ui:triangle-exclamation-fill" width={12} className="shrink-0" />
                      <span>{facultyConflicts[0].message}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Lab Toggle */}
              {canBeLab && (
                <div className="flex items-center justify-between bg-surface-alt rounded-lg border border-border/50 p-3">
                  <div className="flex items-center gap-2">
                    <Icon icon="gravity-ui:flask" width={16} className="text-muted" />
                    <span className="text-sm font-medium">Is Lab Session</span>
                  </div>
                  <Switch
                    isSelected={isLab}
                    onChange={setIsLab}
                    aria-label="Is lab session"
                    size="sm"
                  >
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch>
                </div>
              )}

              {/* Lab Selector */}
              {isLab && (
                <div>
                  <Label className="text-xs font-medium text-muted mb-1.5 block">
                    Select Lab
                  </Label>
                  <Select
                    aria-label="Select lab"
                    selectedKey={selectedLabId || undefined}
                    onSelectionChange={(key) => {
                      if (key !== null) setSelectedLabId(String(key));
                    }}
                    className={`w-full ${labConflicts.length > 0 ? "lab-select--conflict" : ""}`}
                    placeholder="Choose a lab…"
                  >
                    <Select.Trigger className={`h-10 text-sm ${labConflicts.length > 0 ? "!border-danger !ring-1 !ring-danger/30" : ""}`}>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {labRooms.map((r) => (
                          <ListBox.Item key={String(r.id)} id={String(r.id)} textValue={r.name}>
                            <div className="flex items-center gap-2">
                              <Icon icon="gravity-ui:flask" width={14} className="text-accent" />
                              <span className="font-medium text-sm">{r.name}</span>
                            </div>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  {/* Inline lab conflict warning */}
                  {labConflicts.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-danger">
                      <Icon icon="gravity-ui:triangle-exclamation-fill" width={12} className="shrink-0" />
                      <span>{labConflicts[0].message}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Conflict Warnings */}
              {liveConflicts.length > 0 && (
                <div className="rounded-lg border border-warning/30 bg-warning-light p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-warning">
                    <Icon icon="gravity-ui:triangle-exclamation-fill" width={14} />
                    <span>{liveConflicts.length} Conflict{liveConflicts.length > 1 ? "s" : ""} Detected</span>
                  </div>
                  {liveConflicts.map((c, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-warning">
                      <Icon
                        icon={c.type === "faculty" ? "gravity-ui:person" : "gravity-ui:flask"}
                        width={12}
                        className="shrink-0 mt-0.5"
                      />
                      <span>{c.message}</span>
                    </div>
                  ))}
                  <div className="text-[10px] text-muted mt-1">
                    You can still assign — conflicts are warnings only.
                  </div>
                </div>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onPress={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={handleAssign}
              isDisabled={!builtCell}
            >
              <Icon icon="gravity-ui:check" width={16} />
              Assign
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
