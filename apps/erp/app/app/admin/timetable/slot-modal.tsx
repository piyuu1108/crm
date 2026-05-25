"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Button,
  Modal,
  Label,
  Select,
  Checkbox,
  CheckboxGroup,
  Spinner,
  Alert,
  Switch,
  useOverlayState,
} from "@heroui/react";
import type { TimetableAssignment, TimetableSlot } from "@/app/lib/queries/timetable";
import type { ConflictResult, FacultyConflict } from "./use-conflict-map";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const FIXED_TIME_SLOTS = [
  { start: "07:55", end: "08:50", label: "07:55 – 08:50" },
  { start: "08:50", end: "09:40", label: "08:50 – 09:40" },
  { start: "09:50", end: "10:40", label: "09:50 – 10:40" },
  { start: "10:40", end: "11:30", label: "10:40 – 11:30" },
  { start: "11:30", end: "12:20", label: "11:30 – 12:20" },
];

const COLOR_OPTIONS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Pink" },
  { value: "#f43f5e", label: "Rose" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#22c55e", label: "Green" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#3b82f6", label: "Blue" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Deterministically maps a subject name to a color from COLOR_OPTIONS.
 * Same subject name always returns the same color (stable across renders/sessions).
 */
function getSubjectColor(subjectName: string): string {
  let hash = 0;
  for (let i = 0; i < subjectName.length; i++) {
    hash = (hash * 31 + subjectName.charCodeAt(i)) >>> 0; // unsigned 32-bit
  }
  return COLOR_OPTIONS[hash % COLOR_OPTIONS.length].value;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignments: TimetableAssignment[];
  /** Pre-fill when editing an existing slot */
  editingSlot: TimetableSlot | null;
  /** Pre-fill day/time when clicking an empty cell */
  prefillDay?: string;
  prefillStartTime?: string;
  prefillEndTime?: string;
  /** Conflict checker */
  checkConflict: (
    day: string,
    startTime: string,
    endTime: string,
    assignmentId: number,
    isLab: boolean,
    labId: string | null,
    excludeSlot?: TimetableSlot
  ) => ConflictResult[];
  /** Called when user confirms the slot */
  onSubmit: (slots: TimetableSlot[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SlotModal({
  isOpen,
  onClose,
  assignments,
  editingSlot,
  prefillDay,
  prefillStartTime,
  prefillEndTime,
  checkConflict,
  onSubmit,
}: SlotModalProps) {
  const [assignmentId, setAssignmentId] = useState<string>("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [isLab, setIsLab] = useState(false);
  const [labId, setLabId] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<ConflictResult[]>([]);

  const isEditing = !!editingSlot;

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editingSlot) {
        setAssignmentId(String(editingSlot.assignmentId));
        setSelectedDays([editingSlot.dayOfWeek]);
        setStartTime(editingSlot.startTime);
        setEndTime(editingSlot.endTime);
        setColor(editingSlot.color || "#6366f1");
        setIsLab(editingSlot.isLab || false);
        setLabId(editingSlot.labId || "");
      } else {
        setAssignmentId("");
        setSelectedDays(prefillDay ? [prefillDay] : []);
        setStartTime(prefillStartTime || "");
        setEndTime(prefillEndTime || "");
        setColor("#6366f1");
        setIsLab(false);
        setLabId("");
      }
      setErrors({});
      setWarnings([]);
    }
  }, [isOpen, editingSlot, prefillDay, prefillStartTime, prefillEndTime]);

  // Real-time conflict validation
  useEffect(() => {
    if (!isOpen || !assignmentId || !startTime || !endTime || selectedDays.length === 0) {
      setWarnings([]);
      return;
    }

    const allWarnings: ConflictResult[] = [];
    for (const day of selectedDays) {
      const dayConflicts = checkConflict(
        day,
        startTime,
        endTime,
        Number(assignmentId),
        isLab,
        labId || null,
        editingSlot || undefined
      );
      allWarnings.push(...dayConflicts);
    }

    // Deduplicate warnings by message
    const uniqueWarnings = Array.from(new Map(allWarnings.map(w => [w.message, w])).values());
    setWarnings(uniqueWarnings);
  }, [isOpen, assignmentId, selectedDays, startTime, endTime, isLab, labId, checkConflict, editingSlot]);

  const selectedAssignment = useMemo(
    () => assignments.find((a) => String(a.id) === assignmentId),
    [assignmentId, assignments]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    const newErrors: Record<string, string> = {};
    if (!assignmentId) newErrors.assignment = "Please select a subject & faculty";
    if (selectedDays.length === 0) newErrors.days = "Please select at least one day";
    if (!startTime) newErrors.startTime = "Please select a start time";
    if (!endTime) newErrors.endTime = "Please select an end time";
    if (startTime && endTime && startTime >= endTime) {
      newErrors.endTime = "End time must be after start time";
    }
    if (isLab && !labId) {
      newErrors.lab = "Please select a lab";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const slots: TimetableSlot[] = [];
    const assignment = selectedAssignment!;

    for (const day of selectedDays) {
      slots.push({
        id: isEditing && day === editingSlot.dayOfWeek ? editingSlot.id : undefined,
        dayOfWeek: day,
        startTime,
        endTime,
        assignmentId: Number(assignmentId),
        color,
        isLab,
        labId: isLab ? labId : null,
        subjectName: assignment.subjectName,
        facultyName: assignment.facultyName,
        facultyId: assignment.facultyId,
      });
    }

    onSubmit(slots);
    onClose();
  };

  const handleContinueWithWarning = () => {
    handleSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Container placement="center" size="md">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>
              {isEditing ? "Edit Slot" : "Add Slot"}
            </Modal.Heading>
            <p className="text-sm text-muted-foreground mt-1">
              {isEditing
                ? "Modify the class slot details below"
                : "Create a new class slot for the timetable"}
            </p>
          </Modal.Header>

          <Modal.Body>
            <form
              id="slot-form"
              className="flex flex-col gap-5"
              onSubmit={handleSubmit}
            >
              {/* ── Conflicts ─── */}
              {warnings.length > 0 && (
                <Alert color="warning">
                  <Alert.Content>
                    <Alert.Title>Scheduling Conflicts</Alert.Title>
                    <Alert.Description>
                      <ul className="list-disc pl-4 mt-1 space-y-1 text-sm">
                        {warnings.map((w, i) => (
                          <li key={i}>{w.message}</li>
                        ))}
                      </ul>
                    </Alert.Description>
                  </Alert.Content>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => setWarnings([])}
                    >
                      Ignore & Continue
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onPress={handleContinueWithWarning}
                    >
                      Continue Anyway
                    </Button>
                  </div>
                </Alert>
              )}

              {/* ── Subject & Faculty (from assignment) ─── */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">Subject & Faculty *</Label>
                <select
                  className="w-full rounded-lg border border-divider bg-default/5 px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
                  value={assignmentId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAssignmentId(val);
                    setErrors((prev) => ({ ...prev, assignment: "" }));

                    const a = assignments.find((x) => String(x.id) === val);
                    if (a) {
                      // ── Auto-assign a stable color based on subject name ──
                      setColor(getSubjectColor(a.subjectName));

                      // Disable lab if subject type doesn't support it
                      if (
                        a.subjectType?.toLowerCase() !== "practical" &&
                        a.subjectType?.toLowerCase() !== "both"
                      ) {
                        setIsLab(false);
                        setLabId("");
                      }
                    }
                  }}
                >
                  <option value="">Select subject & faculty...</option>
                  {assignments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.subjectName} — {a.facultyName} ({a.subjectType})
                    </option>
                  ))}
                </select>
                {errors.assignment && (
                  <span className="text-xs text-danger">{errors.assignment}</span>
                )}
              </div>

              {/* ── Days selection (multi-select checkboxes) ─── */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">Days *</Label>
                <div className="grid grid-cols-4 gap-2">
                  {DAYS.map((day) => (
                    <label
                      key={day}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium cursor-pointer transition-all ${
                        selectedDays.includes(day)
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-divider bg-default/5 text-foreground/70 hover:border-foreground/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={selectedDays.includes(day)}
                        disabled={isEditing}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDays((prev) => [...prev, day]);
                          } else {
                            setSelectedDays((prev) => prev.filter((d) => d !== day));
                          }
                          setErrors((prev) => ({ ...prev, days: "" }));
                        }}
                      />
                      {day.slice(0, 3)}
                    </label>
                  ))}
                </div>
                {errors.days && (
                  <span className="text-xs text-danger">{errors.days}</span>
                )}
              </div>

              {/* ── Time range (Fixed Slots) ─── */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">Time Slot *</Label>
                <select
                  className="w-full rounded-lg border border-divider bg-default/5 px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
                  value={`${startTime}|${endTime}`}
                  onChange={(e) => {
                    const [s, t] = e.target.value.split("|");
                    setStartTime(s || "");
                    setEndTime(t || "");
                    setErrors((prev) => ({ ...prev, startTime: "", endTime: "" }));
                  }}
                >
                  <option value="|">Select time slot...</option>
                  {FIXED_TIME_SLOTS.map((slot) => (
                    <option key={`${slot.start}|${slot.end}`} value={`${slot.start}|${slot.end}`}>
                      {slot.label}
                    </option>
                  ))}
                </select>
                {errors.startTime && (
                  <span className="text-xs text-danger">{errors.startTime}</span>
                )}
                {errors.endTime && !errors.startTime && (
                  <span className="text-xs text-danger">{errors.endTime}</span>
                )}
              </div>

              {/* ── Lab Toggle & Selection ─── */}
              <div className="flex flex-col gap-3 p-3 border border-divider rounded-lg bg-default/5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Lab / Practical Session</span>
                  <Switch
                    isSelected={isLab}
                    onChange={setIsLab}
                    isDisabled={
                      !selectedAssignment ||
                      (selectedAssignment.subjectType?.toLowerCase() !== "practical" &&
                        selectedAssignment.subjectType?.toLowerCase() !== "both")
                    }
                    size="sm"
                  >
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch>
                </div>

                {isLab && (
                  <div className="flex flex-col gap-1.5 mt-2">
                    <Label className="text-xs font-medium">Select Lab *</Label>
                    <select
                      className="w-full rounded-lg border border-divider bg-default/10 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
                      value={labId}
                      onChange={(e) => {
                        setLabId(e.target.value);
                        setErrors((prev) => ({ ...prev, lab: "" }));
                      }}
                    >
                      <option value="">Select a lab...</option>
                      <option value="LAB1">LAB1</option>
                      <option value="LAB2">LAB2</option>
                      <option value="LAB3">LAB3</option>
                      <option value="LAB4">LAB4</option>
                    </select>
                    {errors.lab && (
                      <span className="text-xs text-danger">{errors.lab}</span>
                    )}
                  </div>
                )}
              </div>

              {/* ── Color picker ─── */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">
                  Color
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    (auto-assigned · override if needed)
                  </span>
                </Label>
                <div className="ml-2 flex flex-wrap gap-3">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      className={`h-8 w-8 rounded-full border-2 transition-all hover:scale-110 ${
                        color === c.value
                          ? "border-foreground scale-110 shadow-md"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: c.value }}
                      onClick={() => setColor(c.value)}
                    />
                  ))}
                </div>
              </div>
            </form>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onPress={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="slot-form" isDisabled={warnings.length > 0}>
              {isEditing ? "Update Slot" : "Add Slot"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}