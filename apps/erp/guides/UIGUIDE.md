# Theme System — Agent Guide

> Short reference for AI agents working on this codebase.
> Single source of truth: `ThemeConfigProvider` in `app/theme/theme-context.tsx`.

---

## Architecture

```
providers.tsx
  └─ ThemeConfigProvider        ← SINGLE source of truth
       ├─ themeMode             ("light" | "dark" | "custom")
       ├─ themeConfig           (accent, base, font, radius)
       ├─ draft                 (uncommitted edits in customizer)
       └─ CSS vars on :root     (instant global propagation)
```

**No `next-themes`.** We own all theme logic. The provider manages:
- `themeMode` — which mode is active
- `themeConfig` — the custom config (used when mode = `"custom"`)
- CSS class toggling (`dark` / `light` on `<html>`)
- `color-scheme` attribute
- `localStorage` persistence under key `"erp-theme"`

---

## How to Use in Any Page/Component

### 1. Import the hook

```tsx
import { useThemeConfig } from "@/app/theme/theme-context";
```

### 2. Read theme state

```tsx
const { themeMode, applied, draft } = useThemeConfig();
// themeMode: "light" | "dark" | "custom"
// applied: the active ThemeConfig (accent, base, font, radius)
// draft: the in-progress edits (only relevant in the customizer)
```

### 3. Switch modes

```tsx
const { setThemeMode } = useThemeConfig();

setThemeMode("light");   // → removes CSS overrides, uses HeroUI defaults
setThemeMode("dark");    // → applies dark preset CSS vars
setThemeMode("custom");  // → applies the saved custom config CSS vars
```

**This is all you need.** The provider handles:
- Writing CSS variables to `:root`
- Toggling `dark`/`light` class on `<html>`
- Persisting to `localStorage`

### 4. Apply custom theme changes (from the customizer)

```tsx
const { updateDraft, applyTheme, saveTheme, resetTheme } = useThemeConfig();

updateDraft({ accentHue: 180 });  // stage a change (no side effects)
applyTheme();                     // apply draft → mode becomes "custom"
saveTheme();                      // apply + persist to localStorage
resetTheme();                     // revert to "light" + clear storage
```

---

## SSR / Static Rendering Rule

**CRITICAL:** Any component that calls `useThemeConfig()` will fail during static generation because the context doesn't exist at build time.

### Fix: Use `dynamic` with `ssr: false`

```tsx
import dynamic from "next/dynamic";

const ThemeSwitcher = dynamic(
  () => import("@/app/theme/theme-switcher"),
  { ssr: false },
);
```

### When is this needed?

| Scenario | SSR-safe? | Fix |
|---|---|---|
| Component is inside a page with `"use client"` | ❌ Still prerendered | Use `dynamic({ ssr: false })` |
| Component inside the customizer page | ✅ Already handled | Page uses `dynamic` import |
| Reading `themeMode` in a layout | ❌ | Use `dynamic` or guard with `mounted` |

---

## Adding the Theme Toggle to Any Page

```tsx
import dynamic from "next/dynamic";

const ThemeSwitcher = dynamic(
  () => import("@/app/theme/theme-switcher"),
  { ssr: false },
);

// Then use in JSX:
<header>
  <ThemeSwitcher />
</header>
```

The `ThemeSwitcher` component (`app/theme/theme-switcher.tsx`) is a ready-made dropdown with 3 options: **Light**, **Dark**, **Custom**. It reads from and writes to the same `ThemeConfigProvider`.

---

## localStorage Schema

```json
{
  "themeMode": "custom",
  "themeConfig": {
    "accentHue": 180,
    "baseLightness": 0.22,
    "fontFamily": "poppins",
    "radius": "large",
    "fieldRadius": "large",
    "preset": "soft"
  }
}
```

Key: `"erp-theme"`

On app load, `ThemeConfigProvider` reads this and applies the saved mode + config.

---

## Sync Rules (CRITICAL)

1. **Never maintain separate theme state.** Always use `useThemeConfig()`.
2. **Never import `next-themes`.** It has been removed. All theme logic is in `ThemeConfigProvider`.
3. **Never set CSS variables manually.** Use `setThemeMode()` or `applyTheme()`.
4. **Never read `localStorage("erp-theme")` directly.** Use the context values.
5. **Always use `dynamic({ ssr: false })` for components that call `useThemeConfig()` if they're rendered during static generation.**

---

## File Map

| File | Purpose |
|---|---|
| `app/theme/theme-context.tsx` | Provider, context, types, CSS variable logic |
| `app/theme/theme-switcher.tsx` | Reusable 3-mode toggle dropdown (Light/Dark/Custom) |
| `app/theme/theme-customizer.tsx` | Full customizer panel (accent, base, font, radius, presets) |
| `app/providers.tsx` | Root provider wrapper (wraps app with `ThemeConfigProvider`) |
| `app/settings/customize/page.tsx` | Route: `/settings/customize` |
| `app/globals.css` | Slider styles, body transitions |
| `app/layout.tsx` | Google Fonts (Inter, Poppins, Roboto) |

---

## Types Reference

```ts
type ThemeMode = "light" | "dark" | "custom";
type FontFamily = "inter" | "poppins" | "roboto";
type RadiusSize = "small" | "medium" | "large";
type ThemePreset = "default" | "dark" | "soft" | "high-contrast";

interface ThemeConfig {
  accentHue: number;       // 0-360 (oklch hue)
  baseLightness: number;   // 0.12 (dark) → 0.97 (light)
  fontFamily: FontFamily;
  radius: RadiusSize;
  fieldRadius: RadiusSize;
  preset: ThemePreset;
}
```

---

## Quick Checklist for New Pages

- [ ] Need theme toggle? → `dynamic(() => import("@/app/theme/theme-switcher"), { ssr: false })`
- [ ] Need to read current mode? → `const { themeMode } = useThemeConfig()`
- [ ] Need conditional styling? → Check `themeMode === "dark"` or read CSS vars
- [ ] Building new theme control? → Use `updateDraft()` + `applyTheme()` pattern
- [ ] Adding to a static page? → Wrap with `dynamic({ ssr: false })`


6. ThemeSwitcher must always read `themeMode` from context and never cache or derive it locally.