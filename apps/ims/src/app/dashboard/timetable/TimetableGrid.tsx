"use client";
// ─────────────────────────────────────────────────────────────────────────────
// TimetableGrid — Renders a WeeklyGrid as an academic timetable
// Days = columns, Lectures = rows. Multi-slot labs span rows via rowSpan.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo } from "react";

interface SlotEntry {
  subject: string;
  subjectCode: string;
  subjectName: string;
  faculty: string;
  facultyName: string;
  type: "theory" | "lab";
  duration: number;
  room?: string;
}

type DayGrid = Record<string, SlotEntry | null>;
type WeeklyGrid = Record<string, DayGrid>;

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};
const DAY_SHORT: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
};

const SLOT_COUNT = 5;

// Curated pastel palette
const PALETTE = [
  { bg: "#e8f0fe", accent: "#4285f4", text: "#1a3b6e" },
  { bg: "#e6f4ea", accent: "#34a853", text: "#1b5e20" },
  { bg: "#fce8e6", accent: "#ea4335", text: "#7f1d1d" },
  { bg: "#fff3e0", accent: "#fb8c00", text: "#6d3a00" },
  { bg: "#f3e8fd", accent: "#a142f4", text: "#4a148c" },
  { bg: "#e0f7fa", accent: "#00acc1", text: "#004d5a" },
  { bg: "#fff8e1", accent: "#f9a825", text: "#5d4004" },
  { bg: "#fce4ec", accent: "#e91e63", text: "#6a0028" },
];

function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface TimetableGridProps {
  grid: WeeklyGrid;
  title?: string;
}

export default function TimetableGrid({ grid, title }: TimetableGridProps) {
  // Build color map deterministically
  const colorMap = useMemo(() => {
    const map = new Map<string, (typeof PALETTE)[0]>();
    const codes = new Set<string>();
    for (const dg of Object.values(grid)) {
      for (const e of Object.values(dg)) {
        if (e) codes.add(e.subjectCode);
      }
    }
    for (const code of codes) {
      if (code === "QUIZ") {
        map.set(code, { bg: "#fef3c7", accent: "#d97706", text: "#78350f" });
      } else {
        map.set(code, PALETTE[hashStr(code) % PALETTE.length]);
      }
    }
    return map;
  }, [grid]);

  // Determine which days actually have data
  const activeDays = useMemo(
    () => DAY_ORDER.filter((d) => grid[d]),
    [grid]
  );

  // Build a skip-set for rowSpan merging: if a multi-slot lab at slot S spans into slot S+1, etc.,
  // we skip rendering cells at those positions.
  // skipMap: Map<"dayKey:slotNum", true>
  const skipMap = useMemo(() => {
    const skip = new Set<string>();
    for (const dayKey of activeDays) {
      const dg = grid[dayKey];
      if (!dg) continue;
      for (let s = 1; s <= SLOT_COUNT; s++) {
        const entry = dg[`lecture${s}`];
        if (entry && entry.duration > 1) {
          for (let k = 1; k < entry.duration && s + k <= SLOT_COUNT; k++) {
            skip.add(`${dayKey}:${s + k}`);
          }
        }
      }
    }
    return skip;
  }, [grid, activeDays]);

  return (
    <div className="tt-wrapper">
      {title && (
        <div className="tt-header">
          <h3 className="tt-title">{title}</h3>
        </div>
      )}
      <div className="tt-scroll">
        <table className="tt-table">
          <thead>
            <tr>
              <th className="tt-corner" />
              {activeDays.map((d) => (
                <th key={d} className="tt-day-col">
                  <span className="tt-day-full">{DAY_LABELS[d]}</span>
                  <span className="tt-day-short">{DAY_SHORT[d]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: SLOT_COUNT }, (_, i) => i + 1).map((slot) => (
              <tr key={slot}>
                <td className="tt-slot-label">
                  <span className="tt-slot-num">Lecture {slot}</span>
                </td>
                {activeDays.map((dayKey) => {
                  // Skip if this cell is merged into a rowSpan above
                  if (skipMap.has(`${dayKey}:${slot}`)) return null;

                  const dg = grid[dayKey];
                  const entry = dg?.[`lecture${slot}`] ?? null;

                  if (!entry) {
                    return (
                      <td key={dayKey} className="tt-cell tt-cell--empty">
                        <div className="tt-empty">—</div>
                      </td>
                    );
                  }

                  const isLab = entry.type === "lab";
                  const span = Math.min(entry.duration, SLOT_COUNT - slot + 1);
                  const colors = colorMap.get(entry.subjectCode) || PALETTE[0];

                  return (
                    <td
                      key={dayKey}
                      rowSpan={span > 1 ? span : undefined}
                      className={`tt-cell ${isLab ? "tt-cell--lab" : "tt-cell--theory"}`}
                      style={{
                        "--cell-bg": colors.bg,
                        "--cell-accent": colors.accent,
                        "--cell-text": colors.text,
                      } as React.CSSProperties}
                    >
                      <div className="tt-card">
                        {entry.subjectCode === "QUIZ" ? (
                          <span className="tt-badge !bg-amber-500 !text-white !border-amber-600">QUIZ</span>
                        ) : isLab && entry.room ? (
                          <span className="tt-badge">{entry.room}</span>
                        ) : null}
                        <span className="tt-subject">{entry.subject}</span>
                        {entry.faculty && <span className="tt-faculty">{entry.faculty}</span>}
                        {isLab && span > 1 && (
                          <span className="tt-duration">{span} slots</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
