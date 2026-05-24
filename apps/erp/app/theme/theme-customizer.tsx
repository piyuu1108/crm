"use client";

import React, { useMemo } from "react";
import {
  Button,
  Card,
  Chip,
  Separator,
  toast,
} from "@heroui/react";

import {
  useThemeConfig,
  THEME_PRESETS,
  type FontFamily,
  type ThemePreset,
} from "./theme-context";

// ═══════════════════════════════════════════════════════════════════════════
// Section wrapper
// ═══════════════════════════════════════════════════════════════════════════
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Theme Presets (Default + Dark only)
// ═══════════════════════════════════════════════════════════════════════════
const PRESET_META: {
  id: ThemePreset;
  name: string;
  desc: string;
}[] = [
  { id: "default", name: "Default", desc: "Light & clean" },
  { id: "dark", name: "Dark", desc: "Easy on the eyes" },
];

function ThemePresetSelector() {
  const { draft, updateDraft } = useThemeConfig();

  return (
    <Section title="Theme Presets" description="Quick-start with a preset">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {PRESET_META.map((p) => {
          const preset = THEME_PRESETS[p.id];
          const active = draft.preset === p.id;
          const accentH = preset.accentHue ?? 254;
          const baseL = preset.baseLightness ?? 0.97;
          const isDark = baseL < 0.5;

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => updateDraft({ ...preset, preset: p.id })}
              className={`group relative flex flex-col overflow-hidden rounded-xl border-2 transition-all ${
                active
                  ? "border-accent shadow-md"
                  : "border-border hover:border-accent/40"
              }`}
            >
              {/* Color preview band */}
              <div
                className="flex h-14 items-end gap-1.5 px-3 pb-2"
                style={{
                  background: `oklch(${baseL} 0 0)`,
                }}
              >
                <div
                  className="h-5 w-10 rounded-md"
                  style={{
                    background: `oklch(0.62 0.195 ${accentH})`,
                  }}
                />
                <div
                  className="h-3 w-6 rounded-sm"
                  style={{
                    background: isDark
                      ? "oklch(0.4 0 0)"
                      : "oklch(0.92 0 0)",
                  }}
                />
              </div>
              {/* Label */}
              <div className="flex flex-col items-start px-3 py-2">
                <span className="text-xs font-semibold text-foreground">
                  {p.name}
                </span>
                <span className="text-[10px] text-muted">{p.desc}</span>
              </div>
              {active && (
                <div className="absolute right-1.5 top-1.5">
                  <Chip
                    variant="primary"
                    className="h-5 bg-accent px-1.5 text-[10px] text-accent-foreground"
                  >
                    Active
                  </Chip>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Accent Color Picker
// ═══════════════════════════════════════════════════════════════════════════
function AccentColorPicker() {
  const { draft, updateDraft } = useThemeConfig();

  const swatchColor = useMemo(
    () => `oklch(0.62 0.195 ${draft.accentHue})`,
    [draft.accentHue],
  );

  return (
    <Section title="Accent Color" description="Choose your brand color">
      <div className="flex items-center gap-4">
        {/* Color swatch */}
        <div
          className="size-10 shrink-0 rounded-xl border-2 border-white shadow-md"
          style={{ background: swatchColor }}
        />
        {/* Hue slider */}
        <div className="flex flex-1 flex-col gap-1.5">
          <input
            type="range"
            min={0}
            max={360}
            value={draft.accentHue}
            onChange={(e) =>
              updateDraft({ accentHue: Number(e.target.value) })
            }
            className="accent-hue-slider h-3 w-full cursor-pointer appearance-none rounded-full"
            style={{
              background:
                "linear-gradient(to right, oklch(0.62 0.195 0), oklch(0.62 0.195 60), oklch(0.62 0.195 120), oklch(0.62 0.195 180), oklch(0.62 0.195 240), oklch(0.62 0.195 300), oklch(0.62 0.195 360))",
            }}
          />
          <span className="text-[11px] tabular-nums text-muted">
            Hue: {draft.accentHue}°
          </span>
        </div>
      </div>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Font Family
// ═══════════════════════════════════════════════════════════════════════════
const FONTS: { id: FontFamily; name: string; sample: string }[] = [
  { id: "inter", name: "Inter", sample: "Modern & Clean" },
  { id: "native", name: "Native", sample: "System Default" },
  { id: "outfit", name: "Outfit", sample: "Geometric & Elegant" },
];

function FontFamilySelector() {
  const { draft, updateDraft } = useThemeConfig();

  return (
    <Section title="Font Family" description="Typography for the entire app">
      <div className="grid grid-cols-3 gap-2">
        {FONTS.map((f) => {
          const active = draft.fontFamily === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => updateDraft({ fontFamily: f.id })}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-center transition-all ${
                active
                  ? "border-accent bg-accent/8 shadow-sm"
                  : "border-border bg-surface hover:border-accent/40"
              }`}
            >
              <span
                className="text-lg font-semibold"
                style={{ fontFamily: f.name + ", sans-serif" }}
              >
                Aa
              </span>
              <span className="text-[11px] font-medium text-foreground">
                {f.name}
              </span>
              <span className="text-[10px] text-muted">{f.sample}</span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Action Bar
// ═══════════════════════════════════════════════════════════════════════════
function ActionBar() {
  const { themeMode, hasChanges, applyTheme, saveTheme, resetTheme } = useThemeConfig();

  const modeLabel = themeMode === "custom" ? "Custom" : themeMode === "dark" ? "Dark" : "Light";

  return (
    <div className="flex flex-col gap-3">
      {/* Current mode indicator */}
      <div className="flex items-center gap-2 text-xs text-muted">
        <span>Current mode:</span>
        <Chip
          variant={themeMode === "custom" ? "primary" : "secondary"}
          className="h-5 px-2 text-[10px] font-medium"
        >
          {modeLabel}
        </Chip>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          isDisabled={!hasChanges}
          onPress={() => {
            applyTheme();
            toast.success("Theme applied", {
              description: "Mode set to Custom. Changes visible across the app.",
            });
          }}
        >
          Apply Theme
        </Button>
        <Button
          variant="secondary"
          onPress={() => {
            saveTheme();
            toast.success("Theme saved", {
              description: "Custom theme persisted. It will load automatically.",
            });
          }}
        >
          Save Theme
        </Button>
        <Button
          variant="tertiary"
          onPress={() => {
            resetTheme();
            toast.success("Theme reset", {
              description: "Reverted to Light mode with default settings.",
            });
          }}
        >
          Reset to Default
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Export
// ═══════════════════════════════════════════════════════════════════════════
export default function ThemeCustomizer() {
  return (
    <div className="flex w-full flex-col gap-6 lg:max-w-md">
      <ThemePresetSelector />
      <Separator />
      <AccentColorPicker />
      <Separator />
      <FontFamilySelector />
      <Separator />
      <ActionBar />
    </div>
  );
}
