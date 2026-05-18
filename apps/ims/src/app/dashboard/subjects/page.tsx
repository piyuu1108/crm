"use client";
import { useState, useEffect } from "react";
import { Button, Tooltip, Modal, TextField, Label, Input, Select, ListBox, Chip, Table } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useDataContext } from "@/contexts/DataContext";
import { suggestShortCode } from "@/lib/validators";
import { ErrorAlert } from "@/components/ui/Alerts";

const SUBJECT_TYPES = ["Theory", "Practical", "Both", "ProjectMinor", "ProjectMajor"] as const;

export default function SubjectsPage() {
  const { subjects, courses, courseId, invalidate } = useDataContext();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<typeof subjects[0] | null>(null);
  const [form, setForm] = useState({ code: "", name: "", shortCode: "", credit: 1, type: "Theory" as string, courseId: "" as number | "", semester: 1 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!editing && form.name) setForm(f => ({ ...f, shortCode: suggestShortCode(f.name) }));
  }, [form.name, editing]);

  const openAdd = () => {
    setEditing(null);
    setForm({ code: "", name: "", shortCode: "", credit: 1, type: "Theory", courseId: courseId || "", semester: 1 });
    setError(""); setShowModal(true);
  };
  const openEdit = (s: typeof subjects[0]) => {
    setEditing(s);
    setForm({ code: s.code, name: s.name, shortCode: s.shortCode, credit: s.credit, type: s.type, courseId: s.courseId, semester: s.semester });
    setError(""); setShowModal(true);
  };

  const handleSave = async () => {
    setError("");
    if (!form.code || !form.name || !form.shortCode || !form.courseId) { setError("All fields are required"); return; }
    setLoading(true);
    try {
      const url = editing ? `/api/subjects/${editing.id}` : "/api/subjects";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, credit: Number(form.credit), semester: Number(form.semester), courseId: Number(form.courseId) }) });
      if (!res.ok) { const data = await res.json(); setError(data.error); return; }
      setShowModal(false);
      await invalidate("subjects");
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this subject?")) return;
    await fetch(`/api/subjects/${id}`, { method: "DELETE" });
    await invalidate("subjects");
  };

  const typeChipColor = (type: string) => {
    switch (type) {
      case "Theory": return "default";
      case "Practical": return "secondary";
      case "Both": return "primary";
      default: return "warning";
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div><h1 className="text-xl font-bold">Subjects</h1><p className="text-sm text-muted mt-1">Manage subjects with credits and types</p></div>
        <Button size="sm" className="w-full sm:w-auto" onPress={openAdd}><Icon icon="gravity-ui:plus" width={14} />Add Subject</Button>
      </div>
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Subjects list" className="min-w-[800px]">
            <Table.Header>
              <Table.Column isRowHeader>Code</Table.Column>
              <Table.Column>Name</Table.Column>
              {/* <Table.Column>Name</Table.Column> */}
              <Table.Column className="text-center">Sem</Table.Column>
              <Table.Column className="text-center">Credit</Table.Column>
              <Table.Column className="text-center">Type</Table.Column>
              <Table.Column>Assignments</Table.Column>
              <Table.Column className="text-end w-20">Actions</Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() => (
                <div className="flex items-center justify-center py-8 text-muted text-sm">No subjects found.</div>
              )}
            >
              {subjects.map((s) => (
                <Table.Row key={s.id} id={s.id}>
                  <Table.Cell className="font-mono">{s.code}</Table.Cell>
                  <Table.Cell>
                    <Tooltip><Tooltip.Trigger><span className="font-mono font-semibold text-accent cursor-default">{s.shortCode}</span></Tooltip.Trigger><Tooltip.Content><div className="info-tooltip"><p className="font-medium">{s.name}</p><p>Code: {s.code}</p><p>Credits: {s.credit}</p><p>Type: {s.type}</p></div></Tooltip.Content></Tooltip>
                  </Table.Cell>
                  {/* <Table.Cell className="text-sm">{s.name}</Table.Cell> */}
                  <Table.Cell className="text-center text-muted">{s.semester}</Table.Cell>
                  <Table.Cell className="text-center font-mono">{s.credit}</Table.Cell>
                  <Table.Cell className="text-center"><Chip className="text-[11px]">{s.type}</Chip></Table.Cell>
                  <Table.Cell>
                    <div className="flex flex-wrap gap-1">
                      {s.assignments.length > 0 ? s.assignments.map((a, i) => (
                        <Tooltip key={i}><Tooltip.Trigger><Chip className="text-xs cursor-default">{a.className}/{a.facultyCode}</Chip></Tooltip.Trigger><Tooltip.Content><div className="info-tooltip"><p>Class: {a.className}</p><p>Faculty: {a.facultyName}</p></div></Tooltip.Content></Tooltip>
                      )) : <span className="text-xs text-muted">—</span>}
                    </div>
                  </Table.Cell>
                  <Table.Cell className="text-end">
                    <div className="flex items-center justify-end gap-1">
                      <Button isIconOnly size="sm" variant="ghost" onPress={() => openEdit(s)} aria-label="Edit subject"><Icon icon="gravity-ui:pencil" width={14} /></Button>
                      <Button isIconOnly size="sm" variant="ghost" onPress={() => handleDelete(s.id)} aria-label="Delete subject" className="hover:text-danger"><Icon icon="gravity-ui:trash-bin" width={14} /></Button>
                    </div>
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
              <Modal.Heading>{editing ? "Edit Subject" : "Add Subject"}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <ErrorAlert message={error} className="mb-4" />
              <div className="grid grid-cols-2 gap-5">
                <TextField name="subjectCode" isRequired value={form.code} onChange={(v) => setForm(f => ({...f, code: v}))}>
                  <Label>Subject Code</Label>
                  <Input placeholder="e.g. 501" />
                </TextField>
                <TextField name="shortCode" isRequired value={form.shortCode} onChange={(v) => setForm(f => ({...f, shortCode: v.toUpperCase()}))}>
                  <Label>Short Code <span className="text-muted font-normal">(auto)</span></Label>
                  <Input placeholder="e.g. ML" className="font-mono" />
                </TextField>
                <div className="col-span-2">
                  <TextField name="subjectName" isRequired value={form.name} onChange={(v) => setForm(f => ({...f, name: v}))}>
                    <Label>Subject Name</Label>
                    <Input placeholder="e.g. Machine Learning" />
                  </TextField>
                </div>
                <TextField name="credit" value={String(form.credit)} onChange={(v) => { const n = v.replace(/\D/g, ''); setForm(f => ({...f, credit: n ? parseInt(n) : 1})); }}>
                  <Label>Credit</Label>
                  <Input inputMode="numeric" pattern="[0-9]*" placeholder="e.g. 4" />
                </TextField>
                <Select
                  className="w-full"
                  aria-label="Type"
                  selectedKey={form.type}
                  onSelectionChange={(key) => { if (key !== null) setForm(f => ({...f, type: String(key)})); }}
                >
                  <Label>Type</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {SUBJECT_TYPES.map(t => (
                        <ListBox.Item key={t} id={t} textValue={t}>{t}<ListBox.ItemIndicator /></ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
                <Select
                  className="w-full"
                  aria-label="Course"
                  selectedKey={form.courseId ? String(form.courseId) : undefined}
                  onSelectionChange={(key) => { if (key !== null) setForm(f => ({...f, courseId: Number(key)})); }}
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
                <TextField name="semester" value={String(form.semester)} onChange={(v) => { const n = v.replace(/\D/g, ''); setForm(f => ({...f, semester: n ? parseInt(n) : 1})); }}>
                  <Label>Semester</Label>
                  <Input inputMode="numeric" pattern="[0-9]*" placeholder="e.g. 1" />
                </TextField>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={() => setShowModal(false)} size="sm">Cancel</Button>
              <Button onPress={handleSave} isDisabled={loading} size="sm">{loading ? "Saving..." : editing ? "Update" : "Create"}</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
