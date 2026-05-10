"use client";

import React from "react";
import { Button, Spinner } from "@heroui/react";

interface SaveBarProps {
  changedCount: number;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function SaveBar({ changedCount, isSaving, onSave, onDiscard }: SaveBarProps) {
  if (changedCount === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-divider bg-content1/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-amber-400/20 text-xs font-bold text-amber-600 dark:text-amber-400">
            {changedCount}
          </span>
          <span className="text-sm text-muted-foreground">
            unsaved change{changedCount !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="tertiary"
            onPress={onDiscard}
            isDisabled={isSaving}
          >
            Discard
          </Button>
          <Button
            size="sm"
            variant="primary"
            onPress={onSave}
            isDisabled={isSaving}
            className="min-w-[100px] gap-2"
          >
            {isSaving ? (
              <>
                <Spinner size="sm" />
                Saving…
              </>
            ) : (
              "Save Attendance"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
