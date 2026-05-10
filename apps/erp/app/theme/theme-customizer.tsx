"use client";

import React, { useMemo } from "react";
import {
  Button,
  Card,
  Chip,
  Label,
  Separator,
  TextField,
  InputGroup,
  ToggleButton,
  ToggleButtonGroup,
  toast,
} from "@heroui/react";

import {
  useThemeConfig,
  THEME_PRESETS,
  type FontFamily,
  type RadiusSize,
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
// 1. Accent Color Picker
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
// 2. Base Color (Lightness)
// ═══════════════════════════════════════════════════════════════════════════
function BaseColorSlider() {
  const { draft, updateDraft } = useThemeConfig();

  const bgPreview = useMemo(
    () => `oklch(${draft.baseLightness} 0 0)`,
    [draft.baseLightness],
  );

  return (
    <Section title="Base Color" description="Adjust background lightness">
      <div className="flex items-center gap-4">
        <div
          className="size-10 shrink-0 rounded-xl border border-border shadow-sm"
          style={{ background: bgPreview }}
        />
        <div className="flex flex-1 flex-col gap-1.5">
          <input
            type="range"
            min={12}
            max={99}
            value={Math.round(draft.baseLightness * 100)}
            onChange={(e) =>
              updateDraft({ baseLightness: Number(e.target.value) / 100 })
            }
            className="base-lightness-slider h-3 w-full cursor-pointer appearance-none rounded-full"
            style={{
              background:
                "linear-gradient(to right, oklch(0.12 0 0), oklch(0.5 0 0), oklch(0.99 0 0))",
            }}
          />
          <div className="flex justify-between text-[11px] text-muted">
            <span>Dark</span>
            <span>Light</span>
          </div>
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
// 4. Radius Controls
// ═══════════════════════════════════════════════════════════════════════════
const RADIUS_OPTIONS: { id: RadiusSize; label: string }[] = [
  { id: "small", label: "Small" },
  { id: "medium", label: "Medium" },
  { id: "large", label: "Large" },
];

function RadiusControls() {
  const { draft, updateDraft } = useThemeConfig();

  return (
    <Section title="Border Radius" description="Control roundness globally">
      <div className="flex flex-col gap-4">
        {/* Global radius */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted">Global Radius</Label>
          <ToggleButtonGroup
            selectionMode="single"
            selectedKeys={new Set([draft.radius])}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as RadiusSize;
              if (selected) updateDraft({ radius: selected });
            }}
          >
            {RADIUS_OPTIONS.map((r) => (
              <ToggleButton key={r.id} id={r.id}>
                {r.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>

        {/* Field radius */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted">Field Radius</Label>
          <ToggleButtonGroup
            selectionMode="single"
            selectedKeys={new Set([draft.fieldRadius])}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as RadiusSize;
              if (selected) updateDraft({ fieldRadius: selected });
            }}
          >
            {RADIUS_OPTIONS.map((r) => (
              <ToggleButton key={r.id} id={r.id}>
                {r.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>
      </div>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. Theme Presets
// ═══════════════════════════════════════════════════════════════════════════
const PRESET_META: {
  id: ThemePreset;
  name: string;
  desc: string;
}[] = [
  { id: "default", name: "Default", desc: "Light & clean" },
  { id: "dark", name: "Dark", desc: "Easy on the eyes" },
  { id: "soft", name: "Soft", desc: "Rounded & warm" },
  { id: "high-contrast", name: "High Contrast", desc: "Sharp & bold" },
  { id: "glassmorphism", name: "Glass", desc: "Frosted & translucent" },
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
          const isGlass = p.id === "glassmorphism";

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
                  background: isGlass
                    ? `linear-gradient(135deg, oklch(${baseL} 0.02 ${accentH}), oklch(${baseL + 0.06} 0.015 ${accentH + 40}))`
                    : `oklch(${baseL} 0 0)`,
                }}
              >
                {isGlass ? (
                  /* Frosted-glass mini-card preview (white/light glass) */
                  <div
                    className="h-6 w-12 rounded-md"
                    style={{
                      background: "oklch(1 0 0 / 0.5)",
                      border: "1px solid oklch(1 0 0 / 0.6)",
                      backdropFilter: "blur(4px)",
                      boxShadow: `inset 0 1px 0 0 oklch(1 0 0 / 0.7), 0 4px 12px oklch(0.5 0.05 ${accentH} / 0.1)`,
                    }}
                  />
                ) : (
                  <>
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
                  </>
                )}
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
// 6. Live Preview
// ═══════════════════════════════════════════════════════════════════════════
function LivePreview() {
  const { draft } = useThemeConfig();

  const accent = `oklch(0.62 0.195 ${draft.accentHue})`;
  const bg = `oklch(${draft.baseLightness} 0 0)`;
  const isDark = draft.baseLightness < 0.5;
  const isGlass = draft.preset === "glassmorphism";
  const fgColor = isDark ? "#f4f4f5" : "#27272a";
  const mutedColor = isDark ? "#a1a1aa" : "#71717a";
  const borderColor = isDark ? "oklch(0.32 0.006 286)" : "oklch(0.92 0.004 286)";

  const radiusVal =
    draft.radius === "small"
      ? "0.25rem"
      : draft.radius === "large"
        ? "1rem"
        : "0.5rem";

  // Glass-specific derived values
  const glassBg = `linear-gradient(135deg, oklch(${draft.baseLightness} 0.015 ${draft.accentHue}), oklch(${Math.max(draft.baseLightness - 0.03, 0.9)} 0.01 ${(draft.accentHue + 50) % 360}))`;
  const glassSurface = "oklch(1 0 0 / 0.55)";
  const glassBorder = `oklch(0.85 0.03 ${draft.accentHue} / 0.5)`;
  const glassFieldBg = "oklch(1 0 0 / 0.45)";
  const glassShadow = `inset 0 1px 1px 0 oklch(1 0 0 / 0.6), 0 8px 32px -4px oklch(0.5 0.06 ${draft.accentHue} / 0.12), 0 2px 6px oklch(0 0 0 / 0.06)`;
  const glassFieldShadow = "inset 0 1px 0 0 oklch(1 0 0 / 0.5), inset 0 2px 4px oklch(0 0 0 / 0.03), 0 1px 3px oklch(0 0 0 / 0.05)";

  const surfaceColor = isGlass ? glassSurface : isDark ? "oklch(0.26 0.006 286)" : "oklch(1 0 0)";
  const usedBorder = isGlass ? glassBorder : borderColor;
  const usedFg = isGlass ? "#1a1a2e" : fgColor;
  const usedMuted = isGlass ? "#6b6b8a" : mutedColor;

  return (
    <Section title="Live Preview" description="How your theme will look">
      <div
        className="relative overflow-hidden rounded-xl border border-border p-5"
        style={{
          background: isGlass ? glassBg : bg,
          minHeight: isGlass ? "200px" : undefined,
        }}
      >
        {/* Glass mode: floating color orbs behind the card */}
        {isGlass && (
          <>
            <div
              className="absolute -left-10 -top-10 h-40 w-40 rounded-full"
              style={{
                background: `radial-gradient(circle, oklch(0.82 0.1 ${draft.accentHue} / 0.35), transparent 70%)`,
                filter: "blur(20px)",
              }}
            />
            <div
              className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full"
              style={{
                background: `radial-gradient(circle, oklch(0.85 0.08 ${(draft.accentHue + 80) % 360} / 0.3), transparent 70%)`,
                filter: "blur(18px)",
              }}
            />
            <div
              className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background: `radial-gradient(circle, oklch(0.88 0.06 ${(draft.accentHue + 160) % 360} / 0.2), transparent 70%)`,
                filter: "blur(16px)",
              }}
            />
          </>
        )}

        {/* Card preview */}
        <div
          className="relative flex flex-col gap-3 rounded-xl border p-4"
          style={{
            background: surfaceColor,
            borderColor: usedBorder,
            borderRadius: `calc(${radiusVal} * 2)`,
            boxShadow: isGlass ? glassShadow : undefined,
            backdropFilter: isGlass ? "blur(20px) saturate(200%)" : undefined,
            WebkitBackdropFilter: isGlass ? "blur(20px) saturate(200%)" : undefined,
          }}
        >
          <span
            className="text-sm font-semibold"
            style={{ color: usedFg, fontFamily: draft.fontFamily }}
          >
            Preview Card
          </span>

          {/* Fake input */}
          <div
            className="flex h-9 items-center border px-3 text-xs"
            style={{
              background: isGlass ? glassFieldBg : isDark ? "oklch(0.27 0.006 286)" : "oklch(1 0 0)",
              borderColor: usedBorder,
              borderRadius: radiusVal,
              color: usedMuted,
              boxShadow: isGlass ? glassFieldShadow : undefined,
              backdropFilter: isGlass ? "blur(12px) saturate(200%)" : undefined,
              WebkitBackdropFilter: isGlass ? "blur(12px) saturate(200%)" : undefined,
            }}
          >
            name@example.com
          </div>

          {/* Buttons row */}
          <div className="flex gap-2">
            <div
              className="flex h-8 items-center justify-center px-4 text-xs font-medium text-white"
              style={{
                background: accent,
                borderRadius: radiusVal,
                boxShadow: isGlass ? `0 4px 16px oklch(0.5 0.1 ${draft.accentHue} / 0.3)` : undefined,
              }}
            >
              Primary
            </div>
            <div
              className="flex h-8 items-center justify-center border px-4 text-xs font-medium"
              style={{
                borderColor: usedBorder,
                borderRadius: radiusVal,
                color: usedFg,
                background: isGlass ? "oklch(1 0 0 / 0.35)" : undefined,
                backdropFilter: isGlass ? "blur(8px) saturate(180%)" : undefined,
                WebkitBackdropFilter: isGlass ? "blur(8px) saturate(180%)" : undefined,
                boxShadow: isGlass ? "inset 0 1px 0 0 oklch(1 0 0 / 0.5)" : undefined,
              }}
            >
              Secondary
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. Action Bar
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
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
      {/* Controls panel */}
      <div className="flex w-full flex-col gap-6 lg:max-w-md">
        <ThemePresetSelector />
        <Separator />
        <AccentColorPicker />
        <BaseColorSlider />
        <Separator />
        <FontFamilySelector />
        <Separator />
        <RadiusControls />
        <Separator />
        <ActionBar />
      </div>

      {/* Live preview panel */}
      <div className="flex w-full flex-1 flex-col gap-6 lg:sticky lg:top-8 lg:self-start">
        <LivePreview />

        {/* Documentation card */}
        <Card>
          <Card.Header>
            <Card.Title className="text-sm font-semibold">
              How it works
            </Card.Title>
          </Card.Header>
          <Card.Content className="flex flex-col gap-2 text-xs text-muted">
            <p>
              <strong className="text-foreground">Accent Color</strong> — Uses
              oklch color space. The hue slider rotates through the color wheel
              while keeping perceived brightness and saturation constant.
            </p>
            <p>
              <strong className="text-foreground">Base Color</strong> — Controls
              the background lightness from dark (0.12) to light (0.97). Surface,
              overlay, and border colors derive from this value.
            </p>
            <p>
              <strong className="text-foreground">Fonts</strong> — Inter
              (geometric, modern), Native (system default), Outfit (geometric,
              elegant). Loaded via Google Fonts & System.
            </p>
            <p>
              <strong className="text-foreground">Radius</strong> — Global
              radius affects cards and containers. Field radius controls inputs
              and buttons separately.
            </p>
            <p>
              <strong className="text-foreground">Persistence</strong> — Click
              &quot;Save Theme&quot; to store in localStorage. Your theme
              auto-loads on every visit.
            </p>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
