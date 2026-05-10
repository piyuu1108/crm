"use client";

import React from "react";
import {
  Button,
  Dropdown,
  Label,
} from "@heroui/react";
import { useThemeConfig, type ThemeMode } from "@/app/theme/theme-context";

// ---------------------------------------------------------------------------
// ThemeSwitcher — 3-mode toggle: Light / Dark / Custom
// Uses the unified ThemeConfigProvider as the single source of truth.
// ---------------------------------------------------------------------------
export default function ThemeSwitcher() {
  const { themeMode, setThemeMode } = useThemeConfig();

  // Sun icon (light), Moon icon (dark), Palette icon (custom)
  const icon =
    themeMode === "dark" ? (
      <svg
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.752 15.002A9.718 9.718 0 0 1 12 21.75 9.75 9.75 0 0 1 8.998 2.248 9.718 9.718 0 0 0 21.752 15.002Z"
        />
      </svg>
    ) : themeMode === "custom" ? (
      <svg
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z"
        />
      </svg>
    ) : (
      <svg
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
        />
      </svg>
    );

  return (
    <Dropdown>
      <Button
        isIconOnly
        aria-label="Toggle theme"
        size="sm"
        variant="tertiary"
      >
        {icon}
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu
          selectionMode="single"
          selectedKeys={new Set([themeMode])}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as ThemeMode;
            if (selected) setThemeMode(selected);
          }}
        >
          <Dropdown.Item id="light" textValue="Light">
            <Dropdown.ItemIndicator />
            <Label>Light</Label>
          </Dropdown.Item>
          <Dropdown.Item id="dark" textValue="Dark">
            <Dropdown.ItemIndicator />
            <Label>Dark</Label>
          </Dropdown.Item>
          <Dropdown.Item id="custom" textValue="Custom">
            <Dropdown.ItemIndicator />
            <Label>Custom</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
