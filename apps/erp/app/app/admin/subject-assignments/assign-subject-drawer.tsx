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
  Chip,
  useFilter,
  toast,
} from "@heroui/react";
import type { UseOverlayStateReturn, Key } from "@heroui/react";
import {
  useSubjectAssignmentsQuery,
  useCreateSubjectAssignmentMutation,
} from "@/app/lib/queries/subject-assignments";

// ─── Subject type badge colors ────────────────────────────────────────────────
const TYPE_COLOR: Record<string, "accent" | "success" | "warning"> = {
  theory: "accent",
  practical: "success",
  both: "warning",
};

interface AssignSubjectDrawerProps {
  state: UseOverlayStateReturn;
}

export function AssignSubjectDrawer({ state }: AssignSubjectDrawerProps) {
  // We fetch data with page=1 just to get dropdown lists (allDivisions, allSubjects, allFaculty)
  const { data, isLoading } = useSubjectAssignmentsQuery({ page: 1 });
  const mutation = useCreateSubjectAssignmentMutation();
  const { contains } = useFilter({ sensitivity: "base" });

  const [divisionId, setDivisionId] = useState<Key | null>(null);
  const [subjectId, setSubjectId] = useState<Key | null>(null);
  const [facultyId, setFacultyId] = useState<Key | null>(null);
  const [errors, setErrors] = useState<{
    division?: string;
    subject?: string;
    faculty?: string;
  }>({});

  // Reset state when drawer opens/closes
  React.useEffect(() => {
    if (!state.isOpen) {
      setDivisionId(null);
      setSubjectId(null);
      setFacultyId(null);
      setErrors({});
    }
  }, [state.isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    let hasError = false;
    const newErrors: { division?: string; subject?: string; faculty?: string } = {};

    if (!divisionId) {
      newErrors.division = "Please select a division";
      hasError = true;
    }
    if (!subjectId) {
      newErrors.subject = "Please select a subject";
      hasError = true;
    }
    if (!facultyId) {
      newErrors.faculty = "Please select a faculty member";
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    try {
      await mutation.mutateAsync({
        divisionId: Number(divisionId),
        subjectId: Number(subjectId),
        facultyId: Number(facultyId),
      });

      toast.success("Subject assigned", {
        description: "The subject has been assigned to the division with the selected faculty.",
      });

      state.close();
    } catch (err) {
      toast.danger("Failed to assign", {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (isLoading || !data) {
    return (
      <Drawer state={state}>
        <Drawer.Backdrop>
          <Drawer.Content placement="right">
            <Drawer.Dialog className="w-full max-w-md">
              <Drawer.CloseTrigger />
              <Drawer.Header>
                <Drawer.Heading>Assign Subject</Drawer.Heading>
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

  const { allDivisions, allFaculty, allSubjects } = data;

  return (
    <Drawer state={state}>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog className="w-full max-w-md">
            <Drawer.CloseTrigger />

            <Drawer.Header>
              <Drawer.Heading>Assign Subject</Drawer.Heading>
            </Drawer.Header>

            <Drawer.Body>
              <form
                id="assign-subject-form"
                className="flex flex-col gap-5"
                onSubmit={handleSubmit}
              >
                {/* ── Division Selection ───────────────────────── */}
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
                      <SearchField autoFocus name="search-division" variant="secondary">
                        <SearchField.Group>
                          <SearchField.SearchIcon />
                          <SearchField.Input placeholder="Search divisions..." />
                          <SearchField.ClearButton />
                        </SearchField.Group>
                      </SearchField>
                      <ListBox
                        renderEmptyState={() => (
                          <EmptyState>No divisions found</EmptyState>
                        )}
                      >
                        {allDivisions.map((div) => (
                          <ListBox.Item
                            key={div.id}
                            id={String(div.id)}
                            textValue={div.displayName}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium font-mono">
                                {div.displayName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {div.specialization} · Sem {div.semesterNo} · Batch{" "}
                                {div.batchYear}
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

                {/* ── Subject Selection ────────────────────────── */}
                <Autocomplete
                  isRequired
                  fullWidth
                  name="subject"
                  placeholder="Search subject..."
                  selectionMode="single"
                  value={subjectId}
                  onChange={(key) => {
                    setSubjectId(key);
                    if (key) setErrors((e) => ({ ...e, subject: undefined }));
                  }}
                  isInvalid={!!errors.subject}
                >
                  <Label>Subject</Label>
                  <Autocomplete.Trigger>
                    <Autocomplete.Value />
                    <Autocomplete.ClearButton />
                    <Autocomplete.Indicator />
                  </Autocomplete.Trigger>
                  <Autocomplete.Popover>
                    <Autocomplete.Filter filter={contains}>
                      <SearchField autoFocus name="search-subject" variant="secondary">
                        <SearchField.Group>
                          <SearchField.SearchIcon />
                          <SearchField.Input placeholder="Search subjects..." />
                          <SearchField.ClearButton />
                        </SearchField.Group>
                      </SearchField>
                      <ListBox
                        renderEmptyState={() => (
                          <EmptyState>No subjects found</EmptyState>
                        )}
                      >
                        {allSubjects.map((sub) => (
                          <ListBox.Item
                            key={sub.id}
                            id={String(sub.id)}
                            textValue={`${sub.code} — ${sub.name}`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">{sub.name}</span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {sub.code}
                                </span>
                              </div>
                              <Chip
                                color={TYPE_COLOR[sub.subjectType] || "accent"}
                                size="sm"
                                variant="soft"
                              >
                                {sub.subjectType}
                              </Chip>
                            </div>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Autocomplete.Filter>
                  </Autocomplete.Popover>
                  {errors.subject && <FieldError>{errors.subject}</FieldError>}
                </Autocomplete>

                {/* ── Faculty Selection ────────────────────────── */}
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
                      <SearchField autoFocus name="search-faculty" variant="secondary">
                        <SearchField.Group>
                          <SearchField.SearchIcon />
                          <SearchField.Input placeholder="Search faculty..." />
                          <SearchField.ClearButton />
                        </SearchField.Group>
                      </SearchField>
                      <ListBox
                        renderEmptyState={() => (
                          <EmptyState>No faculty found</EmptyState>
                        )}
                      >
                        {allFaculty.map((fac) => (
                          <ListBox.Item
                            key={fac.id}
                            id={String(fac.id)}
                            textValue={fac.name}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">{fac.name}</span>
                              {fac.designation && (
                                <span className="text-xs text-muted-foreground">
                                  {fac.designation}
                                </span>
                              )}
                            </div>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
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
                form="assign-subject-form"
                isDisabled={mutation.isPending}
              >
                {mutation.isPending && <Spinner color="current" size="sm" />}
                {mutation.isPending ? "Assigning…" : "Assign Subject"}
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
