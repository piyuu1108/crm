"use client";
import React from "react";
import { Button, Dropdown, Label } from "@heroui/react";

export interface SubjectActionItem {
  id: string;
  label: string;
  onAction: () => void;
  isDisabled?: boolean;
  isDanger?: boolean;
}

interface SubjectActionsMenuProps {
  actions: SubjectActionItem[];
  ariaLabel: string;
  variant?: "secondary" | "ghost" | "primary";
}

export function SubjectActionsMenu({
  actions,
  ariaLabel,
  variant = "ghost",
}: SubjectActionsMenuProps) {
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
      <Dropdown.Popover className="min-w-[200px]">
        <Dropdown.Menu aria-label={ariaLabel}>
          {actions.map((action) => (
            <Dropdown.Item
              key={action.id}
              id={action.id}
              isDisabled={action.isDisabled}
              onAction={() => action.onAction()}
              className={action.isDanger ? "text-danger" : ""}
            >
              <Label className={action.isDanger ? "text-danger cursor-pointer" : "cursor-pointer"}>
                {action.label}
              </Label>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
