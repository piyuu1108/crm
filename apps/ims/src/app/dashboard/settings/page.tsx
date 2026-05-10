"use client";

import { useState, useEffect } from "react";
import { Button, Card, TextField, Label, Input, Select, ListBox, Chip, Alert } from "@heroui/react";
import { Icon } from "@iconify/react";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alerts";
import { useDataContext } from "@/contexts/DataContext";

export default function SettingsPage() {
  const { courses, courseId, specializations, workloadLimit, invalidate } = useDataContext();

  // ─── Courses ───
  const [newCourse, setNewCourse] = useState("");
  const [courseError, setCourseError] = useState("");

  // ─── Specializations ───
  const [newSpecName, setNewSpecName] = useState("");
  const [newSpecCode, setNewSpecCode] = useState("");
  const [newSpecCourseId, setNewSpecCourseId] = useState<string | undefined>(undefined);
  const [specError, setSpecError] = useState("");

  // ─── Workload ───
  const [workloadInput, setWorkloadInput] = useState(String(workloadLimit));
  const [workloadSaved, setWorkloadSaved] = useState(false);

  // Sync workload input when context value changes
  useEffect(() => {
    setWorkloadInput(String(workloadLimit));
  }, [workloadLimit]);

  // Initialize newSpecCourseId to globally selected course when it changes
  useEffect(() => {
    if (courseId) setNewSpecCourseId(String(courseId));
  }, [courseId]);

  // ─── Handlers ───
  const addCourse = async () => {
    setCourseError("");
    if (!newCourse.trim()) return;
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCourse.trim() }),
    });
    if (!res.ok) {
      const data = await res.json();
      setCourseError(data.error);
      return;
    }
    setNewCourse("");
    await invalidate("courses");
  };

  const deleteCourse = async (id: number) => {
    if (!confirm("Delete this course? All related data will be removed.")) return;
    await fetch(`/api/courses/${id}`, { method: "DELETE" });
    // Courses affect everything downstream
    await invalidate("all");
  };

  const addSpec = async () => {
    setSpecError("");
    if (!newSpecName.trim() || !newSpecCode.trim() || !newSpecCourseId) return;
    const res = await fetch("/api/specializations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newSpecName.trim(),
        shortCode: newSpecCode.trim(),
        courseId: parseInt(newSpecCourseId),
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setSpecError(data.error);
      return;
    }
    setNewSpecName("");
    setNewSpecCode("");
    await invalidate("specializations");
  };

  const deleteSpec = async (id: number) => {
    if (!confirm("Delete this specialization?")) return;
    await fetch(`/api/specializations/${id}`, { method: "DELETE" });
    await invalidate("specializations");
  };

  const saveWorkload = async () => {
    const val = parseInt(workloadInput);
    if (isNaN(val) || val <= 0) return;
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: val }),
    });
    await invalidate("workloadLimit");
    setWorkloadSaved(true);
    setTimeout(() => setWorkloadSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-muted mt-1">
          Manage courses, specializations, and workload configuration
        </p>
      </div>

      {/* ─── Courses ─────────────────────────────────────────── */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-2">
            <Icon icon="gravity-ui:tag" width={16} className="text-muted" />
            <Card.Title>Courses</Card.Title>
          </div>
          <Card.Description>Add and manage courses (e.g. BCA, BBA, MMS)</Card.Description>
        </Card.Header>
        <Card.Content>
          <ErrorAlert message={courseError} className="mb-3" />

          <div className="flex gap-2 mb-4">
            <TextField name="newCourse" className="flex-1" value={newCourse} onChange={setNewCourse}>
              <Input
                placeholder="e.g. BCA, BBA, MMS"
                onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && addCourse()}
              />
            </TextField>
            <Button size="sm" onPress={addCourse}>
              <Icon icon="gravity-ui:plus" width={14} />
              Add
            </Button>
          </div>

          <div className="space-y-1">
            {courses.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-alt group transition-colors"
              >
                <span className="text-sm font-medium">{c.name}</span>
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  onPress={() => deleteCourse(c.id)}
                  aria-label={`Delete ${c.name}`}
                  className="opacity-0 group-hover:opacity-100 hover:text-danger transition-opacity"
                >
                  <Icon icon="gravity-ui:trash-bin" width={14} />
                </Button>
              </div>
            ))}
            {courses.length === 0 && (
              <p className="text-sm text-muted py-4 text-center">
                No courses added yet
              </p>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* ─── Specializations ─────────────────────────────────── */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-2">
            <Icon icon="gravity-ui:branches-right" width={16} className="text-muted" />
            <Card.Title>Specializations</Card.Title>
          </div>
          <Card.Description>Manage specializations linked to courses</Card.Description>
        </Card.Header>
        <Card.Content>
          <ErrorAlert message={specError} className="mb-3" />

          {/* Add specialization */}
          <div className="flex gap-2 mb-4">
            <TextField name="specName" className="flex-1" value={newSpecName} onChange={setNewSpecName}>
              <Input placeholder="Name (e.g. Data Science)" />
            </TextField>
            <TextField name="specCode" className="w-24" value={newSpecCode} onChange={(v) => setNewSpecCode(v.toUpperCase())}>
              <Input placeholder="Code" className="font-mono" />
            </TextField>
            <Select
              className="w-[130px]"
              aria-label="Course for specialization"
              selectedKey={newSpecCourseId}
              onSelectionChange={(key) => {
                if (key !== null) setNewSpecCourseId(String(key));
              }}
              placeholder="Course"
            >
              <Select.Trigger className="h-9 text-sm">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {courses.map((c) => (
                    <ListBox.Item key={String(c.id)} id={String(c.id)} textValue={c.name}>
                      {c.name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <Button size="sm" onPress={addSpec}>
              <Icon icon="gravity-ui:plus" width={14} />
              Add
            </Button>
          </div>

          <div className="space-y-1">
            {specializations.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-alt group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Chip className="font-mono text-xs">
                    {s.shortCode}
                  </Chip>
                  <span className="text-sm">{s.name}</span>
                  <span className="text-xs text-muted">
                    ({courses.find((c) => c.id === s.courseId)?.name})
                  </span>
                </div>
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  onPress={() => deleteSpec(s.id)}
                  aria-label={`Delete ${s.name}`}
                  className="opacity-0 group-hover:opacity-100 hover:text-danger transition-opacity"
                >
                  <Icon icon="gravity-ui:trash-bin" width={14} />
                </Button>
              </div>
            ))}
            {specializations.length === 0 && (
              <p className="text-sm text-muted py-4 text-center">
                No specializations added yet
              </p>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* ─── Workload ────────────────────────────────────────── */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-2">
            <Icon icon="gravity-ui:chart-bar" width={16} className="text-muted" />
            <Card.Title>Workload Configuration</Card.Title>
          </div>
          <Card.Description>
            Maximum weekly teaching load (in credits/hours) for all faculty members.
            1 Credit = 1 Hour of teaching load.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          {workloadSaved && <SuccessAlert message="Workload limit saved successfully" className="mb-4" />}
          <div className="flex items-center gap-3">
            <TextField name="workloadLimit" className="w-24" value={workloadInput} onChange={(v) => setWorkloadInput(v.replace(/\D/g, ''))}>
              <Input inputMode="numeric" pattern="[0-9]*" placeholder="e.g. 18" />
            </TextField>
            <span className="text-sm text-muted">credits / week</span>
            <Button size="sm" onPress={saveWorkload}>
              Save
            </Button>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
