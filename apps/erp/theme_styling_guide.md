# Theme & Styling Guide: Light/Dark Mode & Highlights

This developer guide serves as the single source of truth and reference for styling components, forms, and highlights in this codebase. Following these rules ensures that interfaces look stunning, premium, and have flawless readability/contrast in **Light Mode**, **Dark Mode**, and **Custom presets (e.g. Glassmorphism)**.

---

## 1. The Pitfall: Why Hardcoded Colors Break Themes

Hardcoding utility classes like `bg-white`, `bg-slate-50`, or `text-black` breaks the theme engine:
* **The Problem**: In Dark Mode, a hardcoded `bg-white` keeps the background bright white, but default text elements automatically switch to light-gray or white. This results in **white-on-white text** which is completely invisible and unreadable.
* **The Solution**: Avoid hardcoded color utilities for primary UI surfaces. Instead, leverage **Theme CSS Variables** or **HeroUI default components** that automatically adapt to light/dark themes.

---

## 2. Global Theme CSS Variables Reference

The application theme engine propagates a set of OKLCH-based custom properties globally onto `document.documentElement`. Use these variables directly in your Tailwind classes for theme-resilience:

| CSS Variable | Tailwind Usage | Description / Use Case | Light Mode Value | Dark Mode Value |
| :--- | :--- | :--- | :--- | :--- |
| `--background` | `bg-[var(--background)]` | Global layout background color | Light gray / off-white | Pitch black |
| `--surface` | `bg-[var(--surface)]` | Card, container, and dialog background | Pure White (`#ffffff`) | Premium Dark Gray |
| `--field-background` | `bg-[var(--field-background)]` | Input fields, selects, and textareas | Pure White (`#ffffff`) | Medium-Dark Gray |
| `--foreground` | `text-[var(--foreground)]` | Primary text and high-contrast labels | Dark Gray (`#333`) | Luminous White |
| `--muted-foreground` | `text-[var(--muted-foreground)]` | Secondary text, captions, and placeholders | Medium Gray | Muted light-gray |
| `--border` | `border-[var(--border)]` | Soft dividers, borders, and outlines | Subtle light border | Subtle dark border |
| `--accent` | `bg-[var(--accent)]` | Core interactive primary button & focus ring | Theme Accent Blue/Violet | Theme Accent Blue/Violet |
| `--accent-foreground` | `text-[var(--accent-foreground)]` | Text layered directly on top of accent colors | Pure White | Pure White |

---

## 3. Best Practice Implementation Patterns

### A. Input Fields & Dropdowns (Theme-Compliant)
Instead of wrapping native `<select>` or standard `<input>` elements in generic styling, use theme variables or HeroUI's `<Select>`:

```tsx
import { Select, ListBox } from "@heroui/react";
import { Funnel } from "@gravity-ui/icons";

export function ThemeCompliantDropdown() {
  return (
    <Select className="min-w-[200px]" placeholder="Choose Option">
      {/* 1. Use --field-background and --border for the trigger */}
      <Select.Trigger className="bg-[var(--field-background)] border border-[var(--border)] hover:border-accent/40 rounded-lg py-2 px-3 text-sm text-[var(--foreground)] flex items-center justify-between shadow-sm min-h-[38px] w-full">
        <div className="flex items-center gap-2">
          <Funnel className="size-4 text-muted-foreground shrink-0" />
          <Select.Value className="text-sm font-medium text-[var(--foreground)]" />
        </div>
        <Select.Indicator className="size-4 text-default-500" />
      </Select.Trigger>
      
      {/* 2. Use --surface for the popover/list container */}
      <Select.Popover>
        <ListBox className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg p-1 min-w-[200px] outline-none">
          <ListBox.Item id="1" textValue="Option 1" className="text-sm text-[var(--foreground)] rounded-lg px-3 py-2 hover:bg-default-100 cursor-pointer">
            Option 1
          </ListBox.Item>
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
```

### B. Interactive / Clickable Cards with Active State Highlight
For listings (like schedules, lectures, workflows) that support active selection:
* **Background & Text**: Always use `bg-[var(--surface)]` and `text-[var(--foreground)]`.
* **Selected State Outline**: Apply a soft colored shadow-ring (`ring-1 ring-accent/30`) and a defined border highlight (`border-accent shadow-md`).

```tsx
interface CardProps {
  title: string;
  isSelected: boolean;
  onClick: () => void;
}

export function ThemeCompliantCard({ title, isSelected, onClick }: CardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full flex-col gap-2 rounded-xl border px-4 py-3.5 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        isSelected
          ? "border-accent bg-[var(--surface)] shadow-md ring-1 ring-accent/30 text-[var(--foreground)]"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-accent/50 hover:shadow-sm text-[var(--foreground)]"
      }`}
    >
      <span className="text-sm font-semibold">{title}</span>
    </button>
  );
}
```

---

## 4. Key Rules of Thumb for Future Code
1. **Never use `bg-white` on panels, cards, or inputs** unless you explicitly pair it with `text-black` (forcing a light-only block even in dark mode).
2. **Prefer using HeroUI built-in components** (like `<Card>`, `<Button>`, and `<Select>`) where background values are resolved dynamically.
3. When overriding backgrounds, borders, or text colors via custom utility classes, **always refer back to CSS custom variables** (e.g. `bg-[var(--surface)]`).
