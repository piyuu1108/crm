"use client";

import React, { useState, useMemo } from "react";
import {
  Button,
  Drawer,
  EmptyState,
  FieldError,
  Label,
  ListBox,
  SearchField,
  Spinner,
  Autocomplete,
  useFilter,
  toast,
} from "@heroui/react";
import type { UseOverlayStateReturn, Key } from "@heroui/react";
import { useAssignmentsQuery, useCreateAssignmentMutation } from "@/app/lib/queries/assignments";

interface AssignCounselorDrawerProps {
  state: UseOverlayStateReturn;
  preselectedDivisionId?: number | null;
}

export function AssignCounselorDrawer({ state, preselectedDivisionId }: AssignCounselorDrawerProps) {
  const { data, isLoading } = useAssignmentsQuery();
  const mutation = useCreateAssignmentMutation();
  const { contains } = useFilter({ sensitivity: "base" });

  const [divisionId, setDivisionId] = useState<Key | null>(preselectedDivisionId ? String(preselectedDivisionId) : null);
  const [facultyId, setFacultyId] = useState<Key | null>(null);
  const [errors, setErrors] = useState<{ division?: string; faculty?: string }>({});

  // Reset local state when drawer closes
  React.useEffect(() => {
    if (!state.isOpen) {
      setDivisionId(preselectedDivisionId ? String(preselectedDivisionId) : null);
      setFacultyId(null);
      setErrors({});
    } else if (preselectedDivisionId) {
      setDivisionId(String(preselectedDivisionId));
    }
  }, [state.isOpen, preselectedDivisionId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    let hasError = false;
    const newErrors: { division?: string; faculty?: string } = {};

    if (!divisionId) {
      newErrors.division = "Please select a division";
      hasError = true;
    }
    if (!facultyId) {
      newErrors.faculty = "Please select a counselor";
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    try {
      await mutation.mutateAsync({
        facultyId: Number(facultyId),
        divisionId: Number(divisionId),
      });

      toast.success("Counselor assigned", {
        description: "The counselor has been assigned to the division.",
      });

      state.close();
    } catch (err) {
      toast.danger("Failed to assign", {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  if (isLoading || !data) {
    return (
      <Drawer state={state}>
        <Drawer.Backdrop>
          <Drawer.Content placement="right">
            <Drawer.Dialog className="w-full max-w-md">
              <Drawer.CloseTrigger />
              <Drawer.Header>
                <Drawer.Heading>Assign Counselor</Drawer.Heading>
              </Drawer.Header>
              <Drawer.Body className="flex items-center justify-center h-48">
                <Spinner color="current" size="md" />
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    );
  }

  const { allDivisions, allFaculty, divisions } = data;

  return (
    <Drawer state={state}>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog className="w-full max-w-md">
            <Drawer.CloseTrigger />

            <Drawer.Header>
              <Drawer.Heading>Assign Counselor</Drawer.Heading>
            </Drawer.Header>

            <Drawer.Body>
              <form id="assign-counselor-form" className="flex flex-col gap-5" onSubmit={handleSubmit}>
                {/* Division Selection */}
                <Autocomplete
                  isRequired
                  fullWidth
                  name="division"
                  placeholder="Search division..."
                  selectionMode="single"
                  value={divisionId}
                  onChange={(key) => {
                    setDivisionId(key);
                    if (key) setErrors((e) => ({ ...e, division: undefined }));
                  }}
                  isInvalid={!!errors.division}
                >
                  <Label>Division</Label>
                  <Autocomplete.Trigger>
                    <Autocomplete.Value />
                    <Autocomplete.ClearButton />
                    <Autocomplete.Indicator />
                  </Autocomplete.Trigger>
                  <Autocomplete.Popover>
                    <Autocomplete.Filter filter={contains}>
                      <SearchField autoFocus name="search" variant="secondary">
                        <SearchField.Group>
                          <SearchField.SearchIcon />
                          <SearchField.Input placeholder="Search divisions..." />
                          <SearchField.ClearButton />
                        </SearchField.Group>
                      </SearchField>
                      <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
                        {allDivisions.map((div) => (
                          <ListBox.Item key={div.id} id={String(div.id)} textValue={div.displayName}>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium font-mono">{div.displayName}</span>
                              <span className="text-xs text-muted-foreground">
                                {div.specialization} · Sem {div.semesterNo}
                              </span>
                            </div>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Autocomplete.Filter>
                  </Autocomplete.Popover>
                  {errors.division && <FieldError>{errors.division}</FieldError>}
                </Autocomplete>

                {/* Faculty Selection */}
                <Autocomplete
                  isRequired
                  fullWidth
                  name="faculty"
                  placeholder="Search faculty..."
                  selectionMode="single"
                  value={facultyId}
                  onChange={(key) => {
                    setFacultyId(key);
                    if (key) setErrors((e) => ({ ...e, faculty: undefined }));
                  }}
                  isInvalid={!!errors.faculty}
                >
                  <Label>Faculty Member</Label>
                  <Autocomplete.Trigger>
                    <Autocomplete.Value />
                    <Autocomplete.ClearButton />
                    <Autocomplete.Indicator />
                  </Autocomplete.Trigger>
                  <Autocomplete.Popover>
                    <Autocomplete.Filter filter={contains}>
                      <SearchField autoFocus name="search" variant="secondary">
                        <SearchField.Group>
                          <SearchField.SearchIcon />
                          <SearchField.Input placeholder="Search faculty..." />
                          <SearchField.ClearButton />
                        </SearchField.Group>
                      </SearchField>
                      <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
                        {allFaculty.map((fac) => {
                          // Find if they are counseling any division right now
                          const counselingDivs = divisions.filter((d) => 
                            d.counselors.some((c) => c.facultyId === fac.id)
                          );
                          const counselingText = counselingDivs.length > 0 
                            ? `Also counseling ${counselingDivs.map(d => d.displayName).join(", ")}` 
                            : null;

                          return (
                            <ListBox.Item key={fac.id} id={String(fac.id)} textValue={fac.fullName}>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">{fac.fullName}</span>
                                {counselingText && (
                                  <span className="text-[10px] text-muted-foreground italic">
                                    {counselingText}
                                  </span>
                                )}
                              </div>
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          );
                        })}
                      </ListBox>
                    </Autocomplete.Filter>
                  </Autocomplete.Popover>
                  {errors.faculty && <FieldError>{errors.faculty}</FieldError>}
                </Autocomplete>
              </form>
            </Drawer.Body>

            <Drawer.Footer>
              <Button
                variant="secondary"
                onPress={state.close}
                isDisabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="assign-counselor-form"
                isDisabled={mutation.isPending}
              >
                {mutation.isPending && <Spinner color="current" size="sm" />}
                {mutation.isPending ? "Assigning…" : "Assign Counselor"}
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
