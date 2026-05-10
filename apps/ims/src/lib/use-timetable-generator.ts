"use client";
// ─────────────────────────────────────────────────────────────────────────────
// React hook — Manages timetable generation lifecycle (Gemini AI)
// Calls server-side AI API → maps result on client → persists to IndexedDB
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from "react";
import { saveTimetable, loadTimetable, type StoredTimetable } from "./timetable-db";
import { mapGeminiResult } from "./gemini-mapper";

export type GenerationStep =
  | "idle"
  | "fetching_payload"
  | "building_entities"
  | "placing_labs"
  | "placing_theory"
  | "repairing_conflicts"
  | "optimizing_score"
  | "finalizing"
  | "saving"
  | "done"
  | "error";

export const STEP_LABELS: Record<GenerationStep, string> = {
  idle: "Ready",
  fetching_payload: "Loading generation data…",
  building_entities: "Building entities…",
  placing_labs: "Placing lab sessions…",
  placing_theory: "Placing theory lectures…",
  repairing_conflicts: "Repairing conflicts…",
  optimizing_score: "Optimizing schedule…",
  finalizing: "Finalizing timetable…",
  saving: "Saving to local storage…",
  done: "Complete!",
  error: "Generation failed",
};

export interface GeneratorState {
  step: GenerationStep;
  result: StoredTimetable | null;
  error: string | null;
  isGenerating: boolean;
}

/**
 * Hook that manages the full AI-based generation workflow:
 *   1. Call server-side Gemini API endpoint
 *   2. Map ID-based result to viewer format on client
 *   3. Derive faculty + lab timetables
 *   4. Store result in IndexedDB
 */
export function useTimetableGenerator() {
  const [step, setStep] = useState<GenerationStep>("idle");
  const [result, setResult] = useState<StoredTimetable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef(false);

  /**
   * Load previously generated timetable from IndexedDB.
   */
  const loadExisting = useCallback(async () => {
    const stored = await loadTimetable();
    if (stored) setResult(stored);
    return stored;
  }, []);

  /**
   * Run the full AI generation pipeline.
   */
  const generate = useCallback(async (courseId: number, courseName: string) => {
    abortRef.current = false;
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      // Step 1 — Send to AI API
      setStep("fetching_payload");
      await yieldToUI();

      setStep("building_entities");
      await yieldToUI();

      // Simulate progress while waiting for AI
      const progressTimer = setInterval(() => {
        setStep((prev) => {
          if (prev === "building_entities") return "placing_labs";
          if (prev === "placing_labs") return "placing_theory";
          if (prev === "placing_theory") return "repairing_conflicts";
          if (prev === "repairing_conflicts") return "optimizing_score";
          return prev;
        });
      }, 8000);

      const startTime = Date.now();

      const res = await fetch("/api/timetable/generate-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });

      clearInterval(progressTimer);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `API returned ${res.status}`);
      }

      const data = await res.json();

      if (abortRef.current) return;

      const { aiResult, payload } = data;

      if (!aiResult?.timetable) {
        throw new Error(
          " no timetable found.\n" +
          JSON.stringify(aiResult?.conflicts || aiResult?.warnings || [], null, 2)
        );
      }

      // Step 2 — Map AI result on client
      setStep("finalizing");
      await yieldToUI();

      const { classTimetables, facultyTimetables, labTimetables } =
        mapGeminiResult(aiResult, payload);

      const durationMs = Date.now() - startTime;

      // Count totals
      const totalScheduled = aiResult.statistics?.scheduled || 0;
      const totalLabs = aiResult.metadata?.totalLabsScheduled || 0;

      // Step 3 — Save to IndexedDB
      setStep("saving");
      await yieldToUI();

      const stored: Omit<StoredTimetable, "id"> = {
        generatedAt: new Date().toISOString(),
        courseName,
        score: aiResult.score || 0,
        allocations: [], // AI mode doesn't produce allocation objects
        classTimetables,
        facultyTimetables,
        labTimetables,
        metadata: {
          retries: 0,
          durationMs,
          totalTasks: totalScheduled + totalLabs,
          placedTasks: totalScheduled + totalLabs,
        },
      };

      await saveTimetable(stored);

      setResult({ id: "latest", ...stored });
      setStep("done");
    } catch (err: any) {
      setStep("error");
      setError(err?.message || "Unknown error");
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Load the pre-saved best.json timetable.
   */
  const loadBest = useCallback(async (courseId: number, courseName: string) => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      setStep("fetching_payload");
      await yieldToUI();

      const res = await fetch(`/api/timetable/load-best?courseId=${courseId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `API returned ${res.status}`);
      }

      const data = await res.json();
      const { aiResult, payload } = data;

      setStep("finalizing");
      await yieldToUI();

      const { classTimetables, facultyTimetables, labTimetables } =
        mapGeminiResult(aiResult, payload);

      setStep("saving");
      await yieldToUI();

      const stored: Omit<StoredTimetable, "id"> = {
        generatedAt: new Date().toISOString(),
        courseName,
        score: aiResult.score || 0,
        allocations: [],
        classTimetables,
        facultyTimetables,
        labTimetables,
        metadata: {
          retries: 0,
          durationMs: 0,
          totalTasks: aiResult.statistics?.scheduled || 0,
          placedTasks: aiResult.statistics?.scheduled || 0,
        },
      };

      await saveTimetable(stored);
      setResult({ id: "latest", ...stored });
      setStep("done");
    } catch (err: any) {
      setStep("error");
      setError(err?.message || "Unknown error");
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  return {
    step,
    result,
    error,
    isGenerating,
    generate,
    loadBest,
    loadExisting,
    abort,
    setResult,
  };
}

/**
 * Yield to the UI thread so React can re-render progress updates.
 */
function yieldToUI(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 60));
}
