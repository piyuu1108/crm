"use client";

import { useMemo, useCallback, useRef } from "react";
import type {
  TimetableSlot,
  FacultyConflictEntry,
  LabConflictEntry,
  TimetableAssignment,
} from "@/app/lib/queries/timetable";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DivisionConflict {
  type: "division";
  message: string;
  existingSlot: TimetableSlot;
}

export interface FacultyConflict {
  type: "faculty";
  message: string;
  facultyName: string;
  existingSubject: string;
  existingDivision: string;
  existingTime: string;
}

export interface LabConflict {
  type: "lab";
  message: string;
  labId: string;
  existingSubject: string;
  existingDivision: string;
  existingTime: string;
}

export type ConflictResult = DivisionConflict | FacultyConflict | LabConflict;

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * In-memory conflict detection for instant feedback.
 *
 * Builds two maps:
 * 1. Division slot map — key: `day|start|end` → slot (prevents double-booking a division)
 * 2. Faculty slot map  — key: `facultyId|day|start|end` → conflict info (warns about faculty overlap)
 */
export function useConflictMap(
  currentDivisionId: number,
  localSlots: TimetableSlot[],
  serverFacultyConflicts: FacultyConflictEntry[],
  serverLabConflicts: LabConflictEntry[],
  assignments: TimetableAssignment[]
) {
  // Build assignment → faculty lookup
  const assignmentMap = useMemo(() => {
    const map = new Map<number, TimetableAssignment>();
    for (const a of assignments) {
      map.set(a.id, a);
    }
    return map;
  }, [assignments]);

  // Division slot map: prevents two subjects in the same division at the same time
  const divisionSlotMap = useMemo(() => {
    const map = new Map<string, TimetableSlot[]>();
    for (const slot of localSlots) {
      const sStart = slot.startTime.slice(0, 5);
      const sEnd = slot.endTime.slice(0, 5);
      const key = `${slot.dayOfWeek}|${sStart}|${sEnd}`;
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    return map;
  }, [localSlots]);

  // Faculty conflict map: all existing entries from OTHER divisions
  // Key: `facultyId|day|start|end` → list of conflict infos
  const facultyConflictMap = useMemo(() => {
    const map = new Map<string, FacultyConflictEntry[]>();

    // Add server-side conflicts (from other divisions)
    for (const conflict of serverFacultyConflicts) {
      // Exclude entries that belong to the current division (they're handled by divisionSlotMap)
      if (conflict.divisionId === currentDivisionId) continue;

      const cStart = conflict.startTime.slice(0, 5);
      const cEnd = conflict.endTime.slice(0, 5);
      const key = `${conflict.facultyId}|${conflict.dayOfWeek}|${cStart}|${cEnd}`;
      const list = map.get(key) ?? [];
      list.push(conflict);
      map.set(key, list);
    }

    // Add local slots (current division) for cross-checking within the current editing session
    for (const slot of localSlots) {
      const sStart = slot.startTime.slice(0, 5);
      const sEnd = slot.endTime.slice(0, 5);
      const key = `${slot.facultyId}|${slot.dayOfWeek}|${sStart}|${sEnd}`;
      const list = map.get(key) ?? [];
      // Don't add duplicates
      const existing = list.find(
        (c) => c.divisionId === currentDivisionId && c.assignmentId === slot.assignmentId
      );
      if (!existing) {
        list.push({
          facultyId: slot.facultyId,
          facultyName: slot.facultyName,
          dayOfWeek: slot.dayOfWeek,
          startTime: sStart,
          endTime: sEnd,
          divisionId: currentDivisionId,
          divisionName: "", // Will be filled from context
          subjectName: slot.subjectName,
          assignmentId: slot.assignmentId,
        });
        map.set(key, list);
      }
    }

    return map;
  }, [serverFacultyConflicts, localSlots, currentDivisionId]);

  // Lab conflict map: prevents two divisions from using the same lab at the same time
  const labConflictMap = useMemo(() => {
    const map = new Map<string, LabConflictEntry[]>();
    for (const conflict of serverLabConflicts) {
      if (!conflict.labId) continue;
      if (conflict.divisionId === currentDivisionId) continue; // handeled by local slots below
      
      const cStart = conflict.startTime.slice(0, 5);
      const cEnd = conflict.endTime.slice(0, 5);
      const key = `${conflict.labId}|${conflict.dayOfWeek}|${cStart}|${cEnd}`;
      const list = map.get(key) ?? [];
      list.push(conflict);
      map.set(key, list);
    }

    for (const slot of localSlots) {
      if (!slot.isLab || !slot.labId) continue;
      const sStart = slot.startTime.slice(0, 5);
      const sEnd = slot.endTime.slice(0, 5);
      const key = `${slot.labId}|${slot.dayOfWeek}|${sStart}|${sEnd}`;
      const list = map.get(key) ?? [];
      
      const existing = list.find(
        (c) => c.divisionId === currentDivisionId && c.subjectName === slot.subjectName
      );
      if (!existing) {
        list.push({
          labId: slot.labId,
          dayOfWeek: slot.dayOfWeek,
          startTime: sStart,
          endTime: sEnd,
          divisionId: currentDivisionId,
          divisionName: "",
          subjectName: slot.subjectName,
        });
        map.set(key, list);
      }
    }
    return map;
  }, [serverLabConflicts, localSlots, currentDivisionId]);

  /**
   * Check for conflicts when adding/editing a slot.
   *
   * Returns:
   * - DivisionConflict → BLOCK (same division, same time → hard conflict)
   * - FacultyConflict  → WARN (same faculty, different division, same time)
   * - null             → no conflict
   */
  const checkConflict = useCallback(
    (
      day: string,
      startTime: string,
      endTime: string,
      assignmentId: number,
      isLab: boolean,
      labId: string | null,
      excludeSlot?: TimetableSlot
    ): ConflictResult[] => {
      const conflicts: ConflictResult[] = [];
      const nStart = startTime.slice(0, 5);
      const nEnd = endTime.slice(0, 5);

      // 1. Division conflict check (warning)
      const divKey = `${day}|${nStart}|${nEnd}`;
      const existingDivSlots = divisionSlotMap.get(divKey) ?? [];
      const realDivSlots = existingDivSlots.filter((s) => s.id !== excludeSlot?.id || s.assignmentId !== excludeSlot?.assignmentId);
      if (realDivSlots.length > 0) {
        conflicts.push({
          type: "division",
          message: `This time slot already has ${realDivSlots.length} lecture(s) assigned (e.g. "${realDivSlots[0].subjectName}" by ${realDivSlots[0].facultyName})`,
          existingSlot: realDivSlots[0],
        });
      }

      const assignment = assignmentMap.get(assignmentId);
      if (!assignment) return conflicts;

      // 2. Faculty conflict check (warning)
      const facKey = `${assignment.facultyId}|${day}|${nStart}|${nEnd}`;
      const facConflicts = facultyConflictMap.get(facKey);
      if (facConflicts && facConflicts.length > 0) {
        // Filter out the exact slot we are editing
        const realFacConflicts = facConflicts.filter(
          (c) => !(c.divisionId === currentDivisionId && c.assignmentId === assignmentId && (!excludeSlot || excludeSlot.dayOfWeek === c.dayOfWeek))
        );
        if (realFacConflicts.length > 0) {
          const first = realFacConflicts[0];
          conflicts.push({
            type: "faculty",
            message: `${first.facultyName} already has "${first.subjectName}" in ${first.divisionName} at ${first.startTime}–${first.endTime} on ${first.dayOfWeek}`,
            facultyName: first.facultyName,
            existingSubject: first.subjectName,
            existingDivision: first.divisionName,
            existingTime: `${first.startTime}–${first.endTime}`,
          });
        }
      }

      // 3. Lab conflict check (warning)
      if (isLab && labId) {
        const lKey = `${labId}|${day}|${nStart}|${nEnd}`;
        const lConflicts = labConflictMap.get(lKey);
        if (lConflicts && lConflicts.length > 0) {
          const realLabConflicts = lConflicts.filter(
            (c) => !(c.divisionId === currentDivisionId && c.subjectName === assignment.subjectName && (!excludeSlot || excludeSlot.dayOfWeek === c.dayOfWeek))
          );
          if (realLabConflicts.length > 0) {
            const first = realLabConflicts[0];
            conflicts.push({
              type: "lab",
              message: `${labId} is already booked for "${first.subjectName}" in ${first.divisionName} at ${first.startTime}–${first.endTime}`,
              labId: labId,
              existingSubject: first.subjectName,
              existingDivision: first.divisionName,
              existingTime: `${first.startTime}–${first.endTime}`,
            });
          }
        }
      }

      return conflicts;
    },
    [divisionSlotMap, facultyConflictMap, labConflictMap, assignmentMap, currentDivisionId]
  );

  return { checkConflict, divisionSlotMap, facultyConflictMap, labConflictMap };
}
