"use client";
import { useState, useEffect, useMemo } from "react";
import { Button, Tooltip, Modal, TextField, Label, Input, Select, ListBox, Chip, Table } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useDataContext } from "@/contexts/DataContext";
import { generateClassName } from "@/lib/validators";
import { ErrorAlert } from "@/components/ui/Alerts";

export default function ClassesPage() {
  const { classes, courses, courseId, specializations, invalidate } = useDataContext();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ year: new Date().getFullYear() % 100, semester: 1, courseId: "" as number | "", specializationId: "" as number | "", divisionNumber: 1 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Filter specs for the selected form course
  const formSpecs = useMemo(() => {
    const cid = form.courseId || courseId;
    if (!cid) return [];
    return specializations.filter(s => s.courseId === cid);
  }, [form.courseId, courseId, specializations]);

  // Preview class name
  const previewName = useMemo(() => {
    if (form.courseId && form.specializationId) {
      const course = courses.find(c => c.id === form.courseId);
      const spec = formSpecs.find(s => s.id === form.specializationId);
      if (course && spec) return generateClassName(form.year, course.name, spec.shortCode, form.divisionNumber);
    }
  }, [form, courses, formSpecs]);

  // Sort classes by numeric value (removing all letters)
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const numA = parseInt(a.name.replace(/[^\d]/g, ""), 10) || 0;
      const numB = parseInt(b.name.replace(/[^\d]/g, ""), 10) || 0;
      return numA - numB;
    });
  }, [classes]);

  const openAdd = () => {
    setForm({ year: new Date().getFullYear() % 100, semester: 1, courseId: courseId || "", specializationId: "", divisionNumber: 1 });
    setError(""); setShowModal(true);
  };

  const handleSave = async () => {
    setError("");
    if (!form.courseId || !form.specializationId) { setError("All fields required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/classes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, courseId: Number(form.courseId), specializationId: Number(form.specializationId) }) });
      if (!res.ok) { const data = await res.json(); setError(data.error); return; }
      setShowModal(false);
      await invalidate("classes");
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this class?")) return;
    await fetch(`/api/classes/${id}`, { method: "DELETE" });
    await invalidate("classes");
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div><h1 className="text-xl font-bold">Classes</h1><p className="text-sm text-muted mt-1">Manage classes with auto-generated naming</p></div>
        <Button size="sm" className="w-full sm:w-auto" onPress={openAdd}><Icon icon="gravity-ui:plus" width={14} />Add Class</Button>
      </div>
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Classes list" className="min-w-[700px]">
            <Table.Header>
              <Table.Column isRowHeader>Class Name</Table.Column>
              <Table.Column className="text-center">Semester</Table.Column>
              {/* <Table.Column>Specialization</Table.Column> */}
              {/* <Table.Column className="text-center">Div #</Table.Column> */}
              <Table.Column>Assignments</Table.Column>
              <Table.Column className="text-end w-16">Actions</Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() => (
                <div className="flex items-center justify-center py-8 text-muted text-sm">No classes found.</div>
              )}
            >
              {sortedClasses.map((c) => (
                <Table.Row key={c.id} id={c.id}>
                  <Table.Cell className="font-mono font-semibold">{c.name}</Table.Cell>
                  <Table.Cell className="text-center text-muted">{c.semester}</Table.Cell>
                  {/* <Table.Cell>
                    <Tooltip><Tooltip.Trigger><Chip className="text-xs cursor-default">{c.specShortCode}</Chip></Tooltip.Trigger><Tooltip.Content><div className="info-tooltip">{c.specName}</div></Tooltip.Content></Tooltip>
                  </Table.Cell> */}
                  {/* <Table.Cell className="text-center font-mono">{c.divisionNumber}</Table.Cell> */}
                  <Table.Cell>
                    <div className="flex flex-wrap gap-1">
                      {c.assignments.length > 0 ? c.assignments.map((a, i) => (
                        <Tooltip key={i}><Tooltip.Trigger><Chip className="text-xs cursor-default">{a.subjectShortCode}/{a.facultyCode}</Chip></Tooltip.Trigger><Tooltip.Content><div className="info-tooltip"><p>Subject: {a.subjectName}</p><p>Faculty: {a.facultyName}</p></div></Tooltip.Content></Tooltip>
                      )) : <span className="text-xs text-muted">—</span>}
                    </div>
                  </Table.Cell>
                  <Table.Cell className="text-end">
                    <Button isIconOnly size="sm" variant="ghost" onPress={() => handleDelete(c.id)} aria-label="Delete class" className="hover:text-danger"><Icon icon="gravity-ui:trash-bin" width={14} /></Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      {/* HeroUI Modal */}
      <Modal.Backdrop isOpen={showModal} onOpenChange={setShowModal}>
        <Modal.Container placement="center">
          <Modal.Dialog className="sm:max-w-lg">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Add Class</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <ErrorAlert message={error} className="mb-4" />
              {previewName && (
                <div className="mb-5 p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <p className="text-xs text-muted mb-1">Generated Name</p>
                  <p className="text-lg font-mono font-bold text-primary">{previewName}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-5">
                <TextField name="year" value={String(form.year)} onChange={(v) => { const n = v.replace(/\D/g, '').slice(0, 2); setForm(f => ({...f, year: n ? parseInt(n) : 0})); }}>
                  <Label>Year (2-digit)</Label>
                  <Input inputMode="numeric" pattern="[0-9]*" placeholder="e.g. 25" />
                </TextField>
                <TextField name="semester" value={String(form.semester)} onChange={(v) => { const n = v.replace(/\D/g, ''); setForm(f => ({...f, semester: n ? parseInt(n) : 1})); }}>
                  <Label>Semester</Label>
                  <Input inputMode="numeric" pattern="[0-9]*" placeholder="e.g. 1" />
                </TextField>
                <Select
                  className="w-full"
                  aria-label="Course"
                  selectedKey={form.courseId ? String(form.courseId) : undefined}
                  onSelectionChange={(key) => { if (key !== null) setForm(f => ({...f, courseId: Number(key), specializationId: ""})); }}
                  placeholder="Select"
                >
                  <Label>Course</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {courses.map(c => (
                        <ListBox.Item key={String(c.id)} id={String(c.id)} textValue={c.name}>{c.name}<ListBox.ItemIndicator /></ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
                <Select
                  className="w-full"
                  aria-label="Specialization"
                  selectedKey={form.specializationId ? String(form.specializationId) : undefined}
                  onSelectionChange={(key) => { if (key !== null) setForm(f => ({...f, specializationId: Number(key)})); }}
                  placeholder="Select"
                >
                  <Label>Specialization</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {formSpecs.map(s => (
                        <ListBox.Item key={String(s.id)} id={String(s.id)} textValue={`${s.name} (${s.shortCode})`}>{s.name} ({s.shortCode})<ListBox.ItemIndicator /></ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
                <TextField name="divisionNumber" value={String(form.divisionNumber)} onChange={(v) => { const n = v.replace(/\D/g, ''); setForm(f => ({...f, divisionNumber: n ? parseInt(n) : 1})); }}>
                  <Label>Division Number</Label>
                  <Input inputMode="numeric" pattern="[0-9]*" placeholder="e.g. 1" />
                </TextField>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={() => setShowModal(false)} size="sm">Cancel</Button>
              <Button onPress={handleSave} isDisabled={loading} size="sm">{loading ? "Creating..." : "Create"}</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
