"use client";

import React from "react";
import { Button, Dropdown, Label } from "@heroui/react";

export interface StudentActionItem {
  id: string;
  label: string;
  onAction: () => void;
  isDisabled?: boolean;
}

interface StudentActionsMenuProps {
  actions: StudentActionItem[];
  ariaLabel: string;
  variant?: "secondary" | "ghost";
}

export function StudentActionsMenu({
  actions,
  ariaLabel,
  variant = "ghost",
}: StudentActionsMenuProps) {
  return (
    <Dropdown>
      <Button
        isIconOnly
        size="sm"
        variant={variant}
        aria-label={ariaLabel}
        onClick={(event) => event.stopPropagation()}
      >
        ⋮
      </Button>
      <Dropdown.Popover className="min-w-[220px]">
        <Dropdown.Menu aria-label={ariaLabel}>
          {actions.map((action) => (
            <Dropdown.Item
              key={action.id}
              id={action.id}
              isDisabled={action.isDisabled}
              onAction={() => action.onAction()}
            >
              <Label>{action.label}</Label>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
