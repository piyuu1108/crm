import { useState, useEffect, useMemo } from "react";
import type { TimetableSlot } from "@/app/lib/queries/timetable";

export const PASTEL_PALETTE = [
  { bg: "#dbeafe", border: "#93b4f7", text: "#1e3a5f", hex: "#3b82f6" },   // blue
  { bg: "#dcfce7", border: "#86e0a0", text: "#14532d", hex: "#22c55e" },   // green
  { bg: "#fef3c7", border: "#f5d06b", text: "#713f12", hex: "#eab308" },   // amber
  { bg: "#fce7f3", border: "#f5a3c7", text: "#831843", hex: "#ec4899" },   // pink
  { bg: "#ede9fe", border: "#b5a8f3", text: "#3b0764", hex: "#8b5cf6" },   // violet
  { bg: "#ffedd5", border: "#f5b87a", text: "#7c2d12", hex: "#f97316" },   // orange
  { bg: "#e0f2fe", border: "#7ac9f5", text: "#0c4a6e", hex: "#0ea5e9" },   // sky
  { bg: "#fce4ec", border: "#ef9a9a", text: "#7f1d1d", hex: "#ef4444" },   // red
];

export type Palette = typeof PASTEL_PALETTE[0];

const STORAGE_KEY = "erp_timetable_colors_v1";

export function useTimetableColors(slots: TimetableSlot[], groupBy: "subject" | "division" = "subject") {
  const [colorMap, setColorMap] = useState<Record<string, number>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage initially
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setColorMap(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Failed to load timetable colors from local storage", e);
    }
    setIsLoaded(true);
  }, []);

  // Update map when new subjects/classes appear
  useEffect(() => {
    if (!isLoaded || !slots.length) return;

    setColorMap((prev) => {
      const newMap = { ...prev };
      let changed = false;
      let nextColorIndex = Object.keys(newMap).length % PASTEL_PALETTE.length;

      for (const slot of slots) {
        const key = groupBy === "subject" ? slot.subjectName : slot.divisionName;
        // fallback in case divisionName is missing but requested
        const actualKey = key || slot.subjectName; 

        if (!newMap[actualKey]) {
          newMap[actualKey] = nextColorIndex;
          nextColorIndex = (nextColorIndex + 1) % PASTEL_PALETTE.length;
          changed = true;
        }
      }

      if (changed) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newMap));
        return newMap;
      }
      return prev;
    });
  }, [slots, isLoaded, groupBy]);

  const getColorForSlot = (slot: TimetableSlot): Palette => {
    const key = groupBy === "subject" ? slot.subjectName : slot.divisionName;
    const actualKey = key || slot.subjectName;
    
    const colorIndex = colorMap[actualKey];
    if (colorIndex !== undefined) {
      return PASTEL_PALETTE[colorIndex % PASTEL_PALETTE.length];
    }
    // Fallback if not mapped yet
    return PASTEL_PALETTE[0];
  };

  return { getColorForSlot, isLoaded };
}
