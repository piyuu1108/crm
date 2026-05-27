"use client";

import React, { useState } from "react";
import {
  Button,
  Drawer,
  Description,
  FieldError,
  Input,
  Label,
  ListBox,
  Select,
  Spinner,
  TextField,
  toast,
} from "@heroui/react";
import type { UseOverlayStateReturn } from "@heroui/react";
import { useCreateClassroomMutation } from "@/app/lib/queries/classrooms";

interface CreateClassroomDrawerProps {
  state: UseOverlayStateReturn;
}

const FLOOR_OPTIONS = [
  { value: "Ground", label: "Ground Floor" },
  { value: "First", label: "First Floor" },
  { value: "Second", label: "Second Floor" },
  { value: "Third", label: "Third Floor" },
  { value: "Fourth", label: "Fourth Floor" },
];

const INITIAL_FORM = {
  roomCode: "",
  buildingName: "",
  floor: "",
  lectureCapacity: "",
  description: "",
};

type FormErrors = Partial<Record<keyof typeof INITIAL_FORM, string>>;

export function CreateClassroomDrawer({ state }: CreateClassroomDrawerProps) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const mutation = useCreateClassroomMutation();

  const updateField = (field: keyof typeof INITIAL_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const e: FormErrors = {};

    if (!form.roomCode.trim()) {
      e.roomCode = "Room Code is required";
    }

    if (!form.floor) {
      e.floor = "Floor selection is required";
    }

    const capNum = parseInt(form.lectureCapacity, 10);
    if (!form.lectureCapacity.trim() || isNaN(capNum)) {
      e.lectureCapacity = "Lecture Capacity is required";
    } else if (capNum <= 0 || capNum > 500) {
      e.lectureCapacity = "Capacity must be between 1 and 500";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const result = await mutation.mutateAsync({
        roomCode: form.roomCode,
        buildingName: form.buildingName || undefined,
        floor: form.floor,
        lectureCapacity: parseInt(form.lectureCapacity, 10),
        description: form.description || undefined,
      });

      toast.success("Classroom created", {
        description: `Classroom ${result.roomCode} has been created successfully`,
      });

      setForm(INITIAL_FORM);
      setErrors({});
      state.close();
    } catch (err) {
      toast.danger("Failed to create classroom", {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  const handleClose = () => {
    if (!mutation.isPending) {
      setForm(INITIAL_FORM);
      setErrors({});
      state.close();
    }
  };

  return (
    <Drawer state={state}>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog className="w-full max-w-md">
            <Drawer.CloseTrigger />

            <Drawer.Header>
              <Drawer.Heading>Create Classroom</Drawer.Heading>
            </Drawer.Header>

            <Drawer.Body>
              <form
                id="create-classroom-form"
                className="flex flex-col gap-5"
                onSubmit={handleSubmit}
              >
                {/* Room Code */}
                <TextField
                  fullWidth
                  isRequired
                  name="roomCode"
                  value={form.roomCode}
                  onChange={(v) => updateField("roomCode", v)}
                  isInvalid={!!errors.roomCode}
                >
                  <Label>Room Code</Label>
                  <Input placeholder="e.g. G1, LAB-1, S2" variant="secondary" />
                  <Description>A unique identifier for the classroom</Description>
                  {errors.roomCode && <FieldError>{errors.roomCode}</FieldError>}
                </TextField>

                {/* Building Name */}
                <TextField
                  fullWidth
                  name="buildingName"
                  value={form.buildingName}
                  onChange={(v) => updateField("buildingName", v)}
                >
                  <Label>Building / Block Name</Label>
                  <Input placeholder="e.g. Science Block, Main Block" variant="secondary" />
                  <Description>Optional building or block name</Description>
                </TextField>

                {/* Floor */}
                <Select
                  isRequired
                  fullWidth
                  name="floor"
                  placeholder="Select floor"
                  variant="secondary"
                  selectedKey={form.floor}
                  onSelectionChange={(key) => updateField("floor", String(key))}
                  isInvalid={!!errors.floor}
                >
                  <Label>Floor</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {FLOOR_OPTIONS.map((opt) => (
                        <ListBox.Item key={opt.value} id={opt.value} textValue={opt.label}>
                          {opt.label}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                  <Description>Location floor in the building</Description>
                  {errors.floor && <FieldError>{errors.floor}</FieldError>}
                </Select>

                {/* Lecture Capacity */}
                <TextField
                  fullWidth
                  isRequired
                  name="lectureCapacity"
                  value={form.lectureCapacity}
                  onChange={(v) => updateField("lectureCapacity", v)}
                  isInvalid={!!errors.lectureCapacity}
                >
                  <Label>Lecture Capacity</Label>
                  <Input
                    placeholder="e.g. 60"
                    variant="secondary"
                    type="number"
                    min={1}
                    max={500}
                  />
                  <Description>Standard student seating capacity for lectures</Description>
                  {errors.lectureCapacity && <FieldError>{errors.lectureCapacity}</FieldError>}
                </TextField>

                {/* Description */}
                <TextField
                  fullWidth
                  name="description"
                  value={form.description}
                  onChange={(v) => updateField("description", v)}
                >
                  <Label>Description / Notes</Label>
                  <Input placeholder="e.g. Equipped with projector" variant="secondary" />
                  <Description>Optional description or administrative notes</Description>
                </TextField>
              </form>
            </Drawer.Body>

            <Drawer.Footer>
              <Button
                variant="secondary"
                onPress={handleClose}
                isDisabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="create-classroom-form"
                isPending={mutation.isPending}
              >
                {({ isPending }) => (
                  <>
                    {isPending && <Spinner color="current" size="sm" />}
                    {isPending ? "Creating…" : "Create Classroom"}
                  </>
                )}
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
