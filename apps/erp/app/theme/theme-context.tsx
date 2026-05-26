"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type FontFamily = "inter" | "native" | "outfit";
export type RadiusSize = "small" | "medium" | "large";
export type ThemePreset = "default" | "dark" | "soft" | "high-contrast" | "glassmorphism";
export type ThemeMode = "light" | "dark" | "custom";

export interface ThemeConfig {
  accentHue: number; // 0–360 oklch hue
  baseLightness: number; // 0.12 (dark) → 0.97 (light)
  fontFamily: FontFamily;
  radius: RadiusSize;
  fieldRadius: RadiusSize;
  preset: ThemePreset;
}

/** What gets persisted to localStorage. */
interface PersistedTheme {
  themeMode: ThemeMode;
  themeConfig: ThemeConfig;
}

interface ThemeContextValue {
  /** Current active mode — the single source of truth. */
  themeMode: ThemeMode;
  /** Switch between light / dark / custom. */
  setThemeMode: (mode: ThemeMode) => void;
  /** The currently-applied custom config. */
  applied: ThemeConfig;
  /** The draft config the user is editing in the customizer. */
  draft: ThemeConfig;
  /** True when draft differs from applied. */
  hasChanges: boolean;
  /** Update one or more draft fields. */
  updateDraft: (partial: Partial<ThemeConfig>) => void;
  /** Apply draft → applied, set mode to "custom", write CSS vars. */
  applyTheme: () => void;
  /** Apply + persist to localStorage. */
  saveTheme: () => void;
  /** Reset everything to factory defaults (mode → "light"). */
  resetTheme: () => void;
}

// ---------------------------------------------------------------------------
// Defaults & presets
// ---------------------------------------------------------------------------
const STORAGE_KEY = "erp-theme";

const DEFAULT_CONFIG: ThemeConfig = {
  accentHue: 254, // HeroUI default blue-ish
  baseLightness: 0.97,
  fontFamily: "inter",
  radius: "medium",
  fieldRadius: "medium",
  preset: "default",
};

const DARK_CONFIG: ThemeConfig = {
  accentHue: 254,
  baseLightness: 0.16,
  fontFamily: "inter",
  radius: "medium",
  fieldRadius: "medium",
  preset: "dark",
};

export const THEME_PRESETS: Record<ThemePreset, Partial<ThemeConfig>> = {
  default: {
    accentHue: 254,
    baseLightness: 0.97,
    radius: "medium",
    fieldRadius: "medium",
  },
  dark: {
    accentHue: 254,
    baseLightness: 0.16,
    radius: "medium",
    fieldRadius: "medium",
  },
  soft: {
    accentHue: 310,
    baseLightness: 0.96,
    radius: "large",
    fieldRadius: "large",
  },
  "high-contrast": {
    accentHue: 30,
    baseLightness: 0.99,
    radius: "small",
    fieldRadius: "small",
  },
  glassmorphism: {
    accentHue: 250,
    baseLightness: 0.95,
    radius: "large",
    fieldRadius: "large",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const RADIUS_MAP: Record<RadiusSize, string> = {
  small: "0.25rem",
  medium: "0.5rem",
  large: "1rem",
};

const FIELD_RADIUS_MAP: Record<RadiusSize, string> = {
  small: "0.375rem",
  medium: "0.75rem",
  large: "1.5rem",
};

const FONT_MAP: Record<FontFamily, string> = {
  inter: "var(--font-inter), Inter, sans-serif",
  native: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  outfit: "var(--font-outfit), Outfit, sans-serif",
};

/**
 * Write CSS custom-property overrides onto <html> for instant propagation.
 */
function applyCSSVariables(config: ThemeConfig) {
  const el = document.documentElement;
  const isGlass = config.preset === "glassmorphism";

  // Accent color – keep L=0.62, C=0.195 fixed (HeroUI defaults), vary hue
  const h = config.accentHue;
  el.style.setProperty("--accent", `oklch(0.62 0.195 ${h})`);
  el.style.setProperty("--focus", `oklch(0.62 0.195 ${h})`);
  el.style.setProperty("--accent-hue", `${h}`);

  // Base lightness → background & related surfaces
  const L = config.baseLightness;
  const isDark = L < 0.5;

  el.style.setProperty("--background", `oklch(${L} 0 0)`);

  if (isGlass) {
    // ── Glassmorphism overrides (light / white frost) ──
    // Background: a very subtle gradient tint so glass surfaces contrast
    el.style.setProperty("--background",
      `linear-gradient(135deg, oklch(${L} 0.015 ${h}), oklch(${Math.max(L - 0.03, 0.9)} 0.01 ${(h + 50) % 360}))`);

    // Translucent white surfaces — the hallmark of glassmorphism
    el.style.setProperty("--surface", "oklch(1 0 0 / 0.55)");
    el.style.setProperty("--default", "oklch(1 0 0 / 0.4)");
    el.style.setProperty("--foreground", "oklch(0.18 0.01 286)");
    el.style.setProperty("--overlay", "oklch(1 0 0 / 0.65)");
    el.style.setProperty("--field-background", "oklch(1 0 0 / 0.45)");
    el.style.setProperty("--muted-foreground", "oklch(0.45 0.015 286)");
    el.style.setProperty("--muted", "oklch(1 0 0 / 0.4)");
    // Luminous accent-tinted borders (light refraction simulation)
    el.style.setProperty("--border", `oklch(0.85 0.03 ${h} / 0.5)`);
    el.style.setProperty("--separator", `oklch(0.88 0.02 ${h} / 0.35)`);
    el.style.setProperty("--accent-foreground", "oklch(0.99 0 0)");

    // Rich shadows: top edge highlight + colored diffuse glow
    el.style.setProperty("--surface-shadow",
      `inset 0 1px 1px 0 oklch(1 0 0 / 0.6), inset 0 -1px 1px 0 oklch(0.8 0.01 ${h} / 0.1), 0 8px 32px -4px oklch(0.5 0.06 ${h} / 0.12), 0 2px 6px oklch(0 0 0 / 0.06)`);
    el.style.setProperty("--overlay-shadow",
      `inset 0 1px 1px 0 oklch(1 0 0 / 0.7), 0 16px 48px -8px oklch(0.5 0.06 ${h} / 0.15), 0 4px 12px oklch(0 0 0 / 0.08)`);
    el.style.setProperty("--field-shadow",
      `inset 0 1px 0 0 oklch(1 0 0 / 0.5), inset 0 2px 4px oklch(0 0 0 / 0.03), 0 1px 3px oklch(0 0 0 / 0.05)`);

    // Glass-specific: backdrop-filter values consumed by CSS rules
    el.style.setProperty("--glass-blur", "20px");
    el.style.setProperty("--glass-saturation", "200%");
    el.style.setProperty("--glass-active", "1");
  } else if (isDark) {
    el.style.setProperty("--surface", `oklch(${Math.min(L + 0.09, 0.35)} 0.006 286)`);
    el.style.setProperty("--default", `oklch(${Math.min(L + 0.15, 0.4)} 0.006 286)`);
    el.style.setProperty("--foreground", "oklch(0.99 0 0)");
    el.style.setProperty("--overlay", `oklch(${Math.min(L + 0.1, 0.35)} 0.006 286)`);
    el.style.setProperty("--field-background", `oklch(${Math.min(L + 0.15, 0.4)} 0.006 286)`);
    el.style.setProperty("--muted-foreground", "oklch(0.7 0.015 286)");
    el.style.setProperty("--muted", "oklch(0.7 0.015 286)");
    el.style.setProperty("--border", `oklch(${Math.min(L + 0.16, 0.38)} 0.006 286)`);
    el.style.setProperty("--separator", `oklch(${Math.min(L + 0.13, 0.35)} 0.006 286)`);
    el.style.setProperty("--accent-foreground", "oklch(0.99 0 0)");
    el.style.setProperty("--surface-shadow", "0 0 0 0 transparent inset");
    el.style.setProperty("--overlay-shadow", "0 0 0 0 transparent inset");
    el.style.setProperty("--field-shadow", "0 0 0 0 transparent inset");
    // Remove glass-specific vars when not in glass mode
    el.style.removeProperty("--glass-blur");
    el.style.removeProperty("--glass-saturation");
    el.style.removeProperty("--glass-active");
  } else {
    el.style.setProperty("--surface", "oklch(1 0 0)");
    el.style.setProperty("--default", `oklch(${Math.max(L - 0.03, 0.9)} 0.001 286)`);
    el.style.setProperty("--foreground", "oklch(0.21 0.006 286)");
    el.style.setProperty("--overlay", "oklch(1 0 0)");
    el.style.setProperty("--field-background", "oklch(1 0 0)");
    el.style.setProperty("--muted-foreground", "oklch(0.55 0.014 286)");
    el.style.setProperty("--muted", "oklch(0.55 0.014 286)");
    el.style.setProperty("--border", `oklch(${Math.max(L - 0.05, 0.88)} 0.004 286)`);
    el.style.setProperty("--separator", `oklch(${Math.max(L - 0.05, 0.88)} 0.004 286)`);
    el.style.setProperty("--accent-foreground", "oklch(0.99 0 0)");
    el.style.removeProperty("--surface-shadow");
    el.style.removeProperty("--overlay-shadow");
    el.style.removeProperty("--field-shadow");
    // Remove glass-specific vars when not in glass mode
    el.style.removeProperty("--glass-blur");
    el.style.removeProperty("--glass-saturation");
    el.style.removeProperty("--glass-active");
  }

  // Radius
  el.style.setProperty("--radius", RADIUS_MAP[config.radius]);
  el.style.setProperty("--field-radius", FIELD_RADIUS_MAP[config.fieldRadius]);

  // Font
  document.body.style.fontFamily = FONT_MAP[config.fontFamily];
}

function removeCSSVariables() {
  const el = document.documentElement;
  const vars = [
    "--accent", "--focus", "--accent-hue", "--background", "--surface", "--default",
    "--foreground", "--overlay", "--field-background", "--muted", "--muted-foreground",
    "--border", "--separator", "--accent-foreground",
    "--radius", "--field-radius",
    "--surface-shadow", "--overlay-shadow", "--field-shadow",
    "--glass-blur", "--glass-saturation", "--glass-active",
  ];
  vars.forEach((v) => el.style.removeProperty(v));
  document.body.style.removeProperty("font-family");
}

/**
 * Sync the `class` attribute on <html> for HeroUI's built-in .dark rules.
 * This replaces next-themes entirely.
 */
function syncColorSchemeClass(mode: ThemeMode, config: ThemeConfig) {
  const el = document.documentElement;
  const isDark = mode === "dark" || (mode === "custom" && config.baseLightness < 0.5);
  el.classList.toggle("dark", isDark);
  el.classList.toggle("light", !isDark);
  el.style.colorScheme = isDark ? "dark" : "light";
}

function configsEqual(a: ThemeConfig, b: ThemeConfig): boolean {
  return (
    a.accentHue === b.accentHue &&
    a.baseLightness === b.baseLightness &&
    a.fontFamily === b.fontFamily &&
    a.radius === b.radius &&
    a.fieldRadius === b.fieldRadius &&
    a.preset === b.preset
  );
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const ThemeConfigContext = createContext<ThemeContextValue | null>(null);

export function useThemeConfig(): ThemeContextValue {
  const ctx = useContext(ThemeConfigContext);
  if (!ctx) throw new Error("useThemeConfig must be inside ThemeConfigProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider — SINGLE SOURCE OF TRUTH
// ---------------------------------------------------------------------------
export function ThemeConfigProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("light");
  const [applied, setApplied] = useState<ThemeConfig>(DEFAULT_CONFIG);
  const [draft, setDraft] = useState<ThemeConfig>(DEFAULT_CONFIG);

  // ── Load saved theme on mount ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: PersistedTheme = JSON.parse(raw);
        const mode = saved.themeMode || "light";
        const config = { ...DEFAULT_CONFIG, ...saved.themeConfig };

        window.setTimeout(() => {
          setThemeModeState(mode);
          setApplied(config);
          setDraft(config);
        }, 0);

        // Apply the correct theme on load
        if (mode === "custom") {
          applyCSSVariables(config);
        } else if (mode === "dark") {
          applyCSSVariables(DARK_CONFIG);
        } else {
          // light — use HeroUI defaults (no overrides needed)
          removeCSSVariables();
        }
        syncColorSchemeClass(mode, config);
      } else {
        // No saved theme — default to light
        syncColorSchemeClass("light", DEFAULT_CONFIG);
      }
    } catch {
      syncColorSchemeClass("light", DEFAULT_CONFIG);
    }
  }, []);

  // ── Mode switcher (called from the toggle button) ──
  const setThemeMode = useCallback(
    (mode: ThemeMode) => {
      setThemeModeState(mode);

      if (mode === "light") {
        removeCSSVariables();
        syncColorSchemeClass("light", DEFAULT_CONFIG);
      } else if (mode === "dark") {
        applyCSSVariables(DARK_CONFIG);
        syncColorSchemeClass("dark", DARK_CONFIG);
      } else {
        // "custom" — apply the saved custom config
        applyCSSVariables(applied);
        syncColorSchemeClass("custom", applied);
      }

      // Persist the mode change
      const persisted: PersistedTheme = { themeMode: mode, themeConfig: applied };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    },
    [applied],
  );

  const hasChanges = useMemo(() => !configsEqual(applied, draft), [applied, draft]);

  const updateDraft = useCallback((partial: Partial<ThemeConfig>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  // ── Apply: draft → applied, mode → "custom" ──
  const applyTheme = useCallback(() => {
    setApplied(draft);
    setThemeModeState("custom");
    applyCSSVariables(draft);
    syncColorSchemeClass("custom", draft);
  }, [draft]);

  // ── Save: apply + persist both mode and config ──
  const saveTheme = useCallback(() => {
    setApplied(draft);
    setThemeModeState("custom");
    applyCSSVariables(draft);
    syncColorSchemeClass("custom", draft);

    const persisted: PersistedTheme = { themeMode: "custom", themeConfig: draft };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  }, [draft]);

  // ── Reset: clear everything, go back to light ──
  const resetTheme = useCallback(() => {
    const def = { ...DEFAULT_CONFIG };
    setDraft(def);
    setApplied(def);
    setThemeModeState("light");
    removeCSSVariables();
    syncColorSchemeClass("light", DEFAULT_CONFIG);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeMode,
      setThemeMode,
      applied,
      draft,
      hasChanges,
      updateDraft,
      applyTheme,
      saveTheme,
      resetTheme,
    }),
    [themeMode, setThemeMode, applied, draft, hasChanges, updateDraft, applyTheme, saveTheme, resetTheme],
  );

  return (
    <ThemeConfigContext.Provider value={value}>
      {children}
    </ThemeConfigContext.Provider>
  );
}
