"use client";

import dynamic from "next/dynamic";

const ThemeCustomizer = dynamic(
  () => import("@/app/theme/theme-customizer"),
  { ssr: false },
);

export default function CustomizePage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Customize Theme
        </h1>
        <p className="text-sm text-muted">
          Personalize your ERP experience. Changes apply instantly across the
          entire application.
        </p>
      </div>

      {/* Customizer */}
      <ThemeCustomizer />
    </div>
  );
}
