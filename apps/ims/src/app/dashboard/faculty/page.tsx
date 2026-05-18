"use client";

import { useState, useEffect } from "react";
import { Button, Tooltip, Modal, TextField, Label, Input, Select, ListBox, Chip, Table } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useDataContext } from "@/contexts/DataContext";
import { suggestFacultyCode } from "@/lib/validators";
import { ErrorAlert } from "@/components/ui/Alerts";

export default function FacultyPage() {
  const { faculty, courses, courseId, invalidate } = useDataContext();
  const [showModal, setShowModal] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<typeof faculty[0] | null>(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formCourseId, setFormCourseId] = useState<number | "">(courseId || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { setFormCourseId(courseId || ""); }, [courseId]);
  useEffect(() => {
    if (!editingFaculty && formName) setFormCode(suggestFacultyCode(formName));
  }, [formName, editingFaculty]);

  const openAdd = () => {
    setEditingFaculty(null); setFormName(""); setFormCode(""); setFormCourseId(courseId || ""); setError(""); setShowModal(true);
  };

  const openEdit = (f: typeof faculty[0]) => {
    setEditingFaculty(f); setFormName(f.name); setFormCode(f.code); setFormCourseId(f.courseId); setError(""); setShowModal(true);
  };

  const handleSave = async () => {
    setError("");
    if (!formName.trim() || !formCode.trim() || !formCourseId) { setError("All fields are required"); return; }
    setLoading(true);
    try {
      const url = editingFaculty ? `/api/faculty/${editingFaculty.id}` : "/api/faculty";
      const method = editingFaculty ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: formName.trim(), code: formCode.trim().toUpperCase(), courseId: formCourseId }) });
      if (!res.ok) { const data = await res.json(); setError(data.error || "Failed to save"); return; }
      setShowModal(false);
      await invalidate("faculty");
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this faculty member?")) return;
    await fetch(`/api/faculty/${id}`, { method: "DELETE" });
    await invalidate("faculty");
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div><h1 className="text-xl font-bold">Faculty</h1><p className="text-sm text-muted mt-1">Manage faculty members and view their workloads</p></div>
        <Button size="sm" className="w-full sm:w-auto" onPress={openAdd}><Icon icon="gravity-ui:plus" width={14} />Add Faculty</Button>
      </div>
      <Table
        aria-label="Faculty list"
       
      >
        <Table.ScrollContainer>
          <Table.Content aria-label="Faculty content" className="min-w-[700px]">
            <Table.Header>
              <Table.Column isRowHeader>Faculty Code</Table.Column>
              <Table.Column>Name</Table.Column>
              <Table.Column>Assignments</Table.Column>
              <Table.Column className="text-end">Total Load</Table.Column>
              <Table.Column className="text-end w-20">Actions</Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() => (
                <div className="flex items-center justify-center py-8 text-muted text-sm">No faculty members found.</div>
              )}
            >
              {faculty.map((f) => (
                <Table.Row key={f.id} id={f.id}>
                  <Table.Cell>
                    <Tooltip><Tooltip.Trigger><span className="font-mono font-semibold text-primary cursor-default">{f.code}</span></Tooltip.Trigger><Tooltip.Content><div className="info-tooltip">{f.name}</div></Tooltip.Content></Tooltip>
                  </Table.Cell>
                  <Table.Cell className="text-sm font-medium">
                    {(() => {
                      const parts = f.name.trim().split(/\s+/);
                      return parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : f.name;
                    })()}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex flex-wrap gap-1.5">
                      {f.assignments.length > 0 ? f.assignments.map((a, i) => (
                        <Tooltip key={i}><Tooltip.Trigger><Chip className="text-xs cursor-default">{a.className}/{a.subjectShortCode}</Chip></Tooltip.Trigger><Tooltip.Content><div className="info-tooltip"><p className="font-medium">{a.subjectName}</p><p>Code: {a.subjectCode}</p><p>Class: {a.className}</p><p>Credits: {a.subjectCredit}</p></div></Tooltip.Content></Tooltip>
                      )) : <span className="text-xs text-muted">—</span>}
                    </div>
                  </Table.Cell>
                  <Table.Cell className="text-end font-mono"><span className={`font-medium ${f.totalLoad > 0 ? "text-primary" : "text-muted"}`}>{f.totalLoad}</span></Table.Cell>
                  <Table.Cell className="text-end">
                    <div className="flex items-center justify-end gap-1">
                      <Button isIconOnly size="sm" variant="ghost" onPress={() => openEdit(f)} aria-label="Edit faculty"><Icon icon="gravity-ui:pencil" width={14} /></Button>
                      <Button isIconOnly size="sm" variant="ghost" onPress={() => handleDelete(f.id)} aria-label="Delete faculty" className="hover:text-danger"><Icon icon="gravity-ui:trash-bin" width={14} /></Button>
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
              <Modal.Heading>{editingFaculty ? "Edit Faculty" : "Add Faculty"}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <ErrorAlert message={error} className="mb-4" />
              <div className="flex flex-col gap-5">
                <TextField name="facultyName" isRequired value={formName} onChange={setFormName}>
                  <Label>Faculty Name</Label>
                  <Input placeholder="e.g. Priya D Patel" autoFocus />
                </TextField>
                <TextField name="facultyCode" isRequired value={formCode} onChange={(v) => setFormCode(v.toUpperCase())}>
                  <Label>Faculty Code <span className="text-muted font-normal">(auto-suggested)</span></Label>
                  <Input placeholder="e.g. PDP" className="font-mono" />
                </TextField>
                <Select
                  className="w-full"
                  aria-label="Course"
                  selectedKey={formCourseId ? String(formCourseId) : undefined}
                  onSelectionChange={(key) => {
                    if (key !== null) setFormCourseId(Number(key));
                  }}
                  placeholder="Select Course"
                >
                  <Label>Course</Label>
                  <Select.Trigger>
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
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={() => setShowModal(false)} size="sm">Cancel</Button>
              <Button onPress={handleSave} isDisabled={loading} size="sm">{loading ? "Saving..." : editingFaculty ? "Update" : "Create"}</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
