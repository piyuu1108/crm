"use client";
import { useState, useEffect } from "react";
import { Button, Modal, TextField, Label, Input, Select, ListBox, Table, Tooltip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { ErrorAlert } from "@/components/ui/Alerts";

interface Lab {
  id: number;
  name: string;
}

interface TimetableCell {
  day: string;
  assigned: boolean;
  className: string | null;
  subjectCode: string | null;
  subjectName: string | null;
  facultyInitials: string | null;
}

interface TimetableRow {
  lectureNumber: number;
  days: TimetableCell[];
}

export default function LabsPage() {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<number | null>(null);
  const [timetable, setTimetable] = useState<TimetableRow[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Lab | null>(null);
  const [formName, setFormName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [timetableLoading, setTimetableLoading] = useState(false);

  useEffect(() => {
    fetchLabs();
  }, []);

  useEffect(() => {
    if (selectedLabId) {
      fetchTimetable(selectedLabId);
    } else {
      setTimetable([]);
    }
  }, [selectedLabId]);

  const fetchLabs = async () => {
    try {
      const res = await fetch("/api/labs");
      if (res.ok) {
        const data = await res.json();
        setLabs(data);
        if (data.length > 0 && !selectedLabId) {
          setSelectedLabId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch labs", err);
    }
  };

  const fetchTimetable = async (id: number) => {
    setTimetableLoading(true);
    try {
      const res = await fetch(`/api/labs/${id}/timetable`);
      if (res.ok) {
        const data = await res.json();
        setTimetable(data);
      }
    } catch (err) {
      console.error("Failed to fetch timetable", err);
    } finally {
      setTimetableLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setFormName("");
    setError("");
    setShowModal(true);
  };

  const openTimetable = (lab: Lab) => {
    setSelectedLabId(lab.id);
  };

  const closeTimetable = () => {
    setSelectedLabId(null);
  };


  const openEdit = (lab: Lab) => {
    setEditing(lab);
    setFormName(lab.name);
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    setError("");
    if (!formName.trim()) {
      setError("Lab name is required");
      return;
    }
    setLoading(true);
    try {
      const url = editing ? `/api/labs/${editing.id}` : "/api/labs";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }
      await fetchLabs();
      setShowModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this Lab? Future timetable assignments will be affected.")) return;
    try {
      await fetch(`/api/labs/${id}`, { method: "DELETE" });
      if (selectedLabId === id) setSelectedLabId(null);
      await fetchLabs();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Laboratory Management</h1>
          <p className="text-sm text-muted mt-1">Manage physical labs and view their timetable occupancy</p>
        </div>
        <Button size="sm" onPress={openAdd}>
          <Icon icon="gravity-ui:plus" width={14} /> Add LAB
        </Button>
      </div>

      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Labs list" className="min-w-[600px]">
            <Table.Header>
              <Table.Column isRowHeader>LAB Name</Table.Column>
              <Table.Column className="text-end w-32">Actions</Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() => (
                <div className="flex items-center justify-center py-8 text-muted text-sm">No labs found.</div>
              )}
            >
              {labs.map((lab) => (
                <Table.Row key={lab.id} id={String(lab.id)}>
                  <Table.Cell className="font-mono font-semibold">{lab.name}</Table.Cell>
                  <Table.Cell className="text-end">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <Tooltip.Trigger>
                          <Button isIconOnly size="sm" variant="ghost" onPress={() => openTimetable(lab)} aria-label="View timetable">
                            <Icon icon="gravity-ui:calendar" width={14} />
                          </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>View Timetable</Tooltip.Content>
                      </Tooltip>
                      <Button isIconOnly size="sm" variant="ghost" onPress={() => openEdit(lab)} aria-label="Edit lab">
                        <Icon icon="gravity-ui:pencil" width={14} />
                      </Button>
                      <Button isIconOnly size="sm" variant="ghost" onPress={() => handleDelete(lab.id)} aria-label="Delete lab" className="hover:text-danger">
                        <Icon icon="gravity-ui:trash-bin" width={14} />
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      {/* HeroUI Modal for Timetable View */}
      <Modal.Backdrop isOpen={selectedLabId !== null} onOpenChange={(isOpen) => !isOpen && closeTimetable()}>
        <Modal.Container placement="center">
          <Modal.Dialog className="sm:max-w-5xl">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{labs.find(l => l.id === selectedLabId)?.name} - Timetable</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-0">
              <div className="overflow-auto max-h-[60vh] border-y border-border">
                {timetableLoading ? (
                  <div className="flex items-center justify-center py-12 text-muted">Loading timetable...</div>
                ) : (
                  <Table aria-label="LAB Timetable Table">
                    <Table.ScrollContainer>
                      <Table.Content className="w-full h-full min-w-[800px]">
                        <Table.Header>
                          <Table.Column isRowHeader className="w-32 bg-sidebar-bg sticky left-0 z-10 border-r border-border">Slot</Table.Column>
                          <Table.Column className="bg-sidebar-bg">Monday</Table.Column>
                          <Table.Column className="bg-sidebar-bg">Tuesday</Table.Column>
                          <Table.Column className="bg-sidebar-bg">Wednesday</Table.Column>
                          <Table.Column className="bg-sidebar-bg">Thursday</Table.Column>
                          <Table.Column className="bg-sidebar-bg">Friday</Table.Column>
                          <Table.Column className="bg-sidebar-bg">Saturday</Table.Column>
                        </Table.Header>
                        <Table.Body
                          renderEmptyState={() => (
                            <div className="flex items-center justify-center py-12 text-muted">
                              No timetable data available.
                            </div>
                          )}
                        >
                          {timetable.map((row) => (
                            <Table.Row key={`lecture-${row.lectureNumber}`}>
                              <Table.Cell className="font-semibold text-muted text-sm bg-sidebar-bg sticky left-0 z-10 border-r border-border shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                                Lecture {row.lectureNumber}
                              </Table.Cell>
                              {row.days.map((cell, idx) => (
                                <Table.Cell key={idx} className="border-r border-border last:border-r-0 align-top p-3 h-[80px]">
                                  {cell.assigned ? (
                                    <div className="flex flex-col gap-1 text-sm">
                                      <span className="font-semibold text-accent">{cell.className}</span>
                                      <span className="text-muted">{cell.subjectCode} - {cell.subjectName} {cell.facultyInitials ? `(${cell.facultyInitials})` : ""}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center h-full text-muted text-xs italic opacity-50">
                                      Not Assigned
                                    </div>
                                  )}
                                </Table.Cell>
                              ))}
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Content>
                    </Table.ScrollContainer>
                  </Table>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button onPress={closeTimetable} size="sm">Close</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* HeroUI Modal for Add/Edit LAB */}
      <Modal.Backdrop isOpen={showModal} onOpenChange={setShowModal}>
        <Modal.Container placement="center">
          <Modal.Dialog className="sm:max-w-sm">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{editing ? "Edit LAB" : "Add LAB"}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <ErrorAlert message={error} className="mb-4" />
              <TextField name="labName" isRequired value={formName} onChange={(v) => setFormName(v)}>
                <Label>LAB Name</Label>
                <Input placeholder="e.g. LAB-1" />
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={() => setShowModal(false)} size="sm">Cancel</Button>
              <Button onPress={handleSave} isDisabled={loading} size="sm">
                {loading ? "Saving..." : editing ? "Update" : "Create"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
