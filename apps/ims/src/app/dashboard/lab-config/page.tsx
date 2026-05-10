"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Button, Modal, Select, ListBox, Label, Chip, Table, Tooltip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useDataContext } from "@/contexts/DataContext";
import { ErrorAlert } from "@/components/ui/Alerts";

interface AssignmentInfo {
  assignmentId: number;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  subjectShortCode: string;
  subjectCredit: number;
  subjectType: string;
  facultyCode: string;
  className: string;
}

interface SessionRow {
  sessionType: "Theory" | "Lab";
  roomId: number | null;
  durationSlots: number;
}

interface Lab {
  id: number;
  name: string;
}

interface SavedSession {
  id: number;
  assignmentId: number;
  sessionType: "Theory" | "Lab";
  roomId: number | null;
  roomName: string | null;
  durationSlots: number;
}

export default function LabConfigPage() {
  const { classes, courseId } = useDataContext();
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(undefined);
  const [assignmentsList, setAssignmentsList] = useState<AssignmentInfo[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentInfo | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showWeights, setShowWeights] = useState(false);
  const [labWeights, setLabWeights] = useState<{ name: string; totalSlots: number; details: { className: string; subjectShortCode: string; slots: number }[] }[]>([]);
  const [weightsLoading, setWeightsLoading] = useState(false);

  // Fetch labs on mount
  useEffect(() => {
    fetch("/api/labs")
      .then((r) => r.json())
      .then((data) => setLabs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Fetch assignments for selected class (only Practical/Both subjects)
  useEffect(() => {
    if (!selectedClassId) {
      setAssignmentsList([]);
      setSelectedAssignment(null);
      return;
    }
    setSelectedAssignment(null);
    setSessions([]);
    setSavedSessions([]);
    fetchAssignments(selectedClassId);
  }, [selectedClassId]);

  const fetchAssignments = async (classId: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/assignments/by-class?classId=${classId}&labOnly=true`
      );
      if (!res.ok) {
        setAssignmentsList([]);
        return;
      }
      const data = await res.json();
      setAssignmentsList(Array.isArray(data) ? data : []);
    } catch {
      setAssignmentsList([]);
    } finally {
      setLoading(false);
    }
  };

  const selectAssignment = useCallback(
    async (assignment: AssignmentInfo) => {
      setSelectedAssignment(assignment);
      setError("");

      // Fetch existing sessions for this assignment
      try {
        const res = await fetch(
          `/api/lab-sessions?assignmentId=${assignment.assignmentId}`
        );
        const data: SavedSession[] = await res.json();
        setSavedSessions(data);

        if (data.length > 0) {
          setSessions(
            data.map((s) => ({
              sessionType: s.sessionType,
              roomId: s.roomId,
              durationSlots: s.durationSlots,
            }))
          );
        } else {
          // Pre-fill with empty rows matching credit count
          setSessions(
            Array.from({ length: assignment.subjectCredit }, () => ({
              sessionType: "Theory" as const,
              roomId: null,
              durationSlots: 1,
            }))
          );
        }
      } catch {
        setSessions(
          Array.from({ length: assignment.subjectCredit }, () => ({
            sessionType: "Theory" as const,
            roomId: null,
            durationSlots: 1,
          }))
        );
        setSavedSessions([]);
      }
    },
    []
  );

  // Session management
  const addSession = () => {
    setSessions((prev) => [...prev, { sessionType: "Theory", roomId: null, durationSlots: 1 }]);
  };

  const removeSession = (idx: number) => {
    setSessions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSession = (idx: number, field: string, value: any) => {
    setSessions((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        const updated = { ...s, [field]: value };
        // Auto-correct: theory always 1 slot, clear room for theory
        if (field === "sessionType" && value === "Theory") {
          updated.durationSlots = 1;
          updated.roomId = null;
        }
        return updated;
      })
    );
  };

  // Computed validation
  const configuredCount = sessions.length;
  const requiredCredits = selectedAssignment?.subjectCredit ?? 0;
  const remaining = requiredCredits - configuredCount;
  const hasLabWithoutRoom = sessions.some(
    (s) => s.sessionType === "Lab" && !s.roomId
  );
  const isValid = configuredCount === requiredCredits && !hasLabWithoutRoom;

  const handleSave = async () => {
    if (!selectedAssignment || !isValid) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        `/api/lab-sessions/${selectedAssignment.assignmentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessions }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }
      const saved = await res.json();
      setSavedSessions(saved);
      // Refresh assignment list sessions
      if (selectedClassId) {
        fetchAssignments(selectedClassId);
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  // Filtered classes
  const filteredClasses = useMemo(
    () => classes.filter((c) => !courseId || c.courseId === courseId),
    [classes, courseId]
  );

  const fetchLabWeights = async () => {
    setWeightsLoading(true);
    try {
      const weights = new Map<number, { name: string; totalSlots: number; details: { className: string; subjectShortCode: string; slots: number }[] }>();
      for (const lab of labs) {
        weights.set(lab.id, { name: lab.name, totalSlots: 0, details: [] });
      }
      for (const cls of filteredClasses) {
        const res = await fetch(`/api/lab-sessions?classId=${cls.id}`);
        if (!res.ok) continue;
        const rows = await res.json();
        if (!Array.isArray(rows)) continue;
        for (const row of rows) {
          if (row.sessionType === "Lab" && row.roomId) {
            const slots = row.durationSlots || 1;
            const existing = weights.get(row.roomId);
            if (existing) {
              existing.totalSlots += slots;
              existing.details.push({ className: row.className || cls.name, subjectShortCode: row.subjectShortCode || row.subjectCode || "—", slots });
            } else {
              weights.set(row.roomId, {
                name: row.roomName || `Room ${row.roomId}`,
                totalSlots: slots,
                details: [{ className: row.className || cls.name, subjectShortCode: row.subjectShortCode || row.subjectCode || "—", slots }],
              });
            }
          }
        }
      }
      setLabWeights(
        Array.from(weights.values()).sort((a, b) => b.totalSlots - a.totalSlots)
      );
    } catch {
      setLabWeights([]);
    } finally {
      setWeightsLoading(false);
    }
  };

  const openWeights = () => {
    setShowWeights(true);
    fetchLabWeights();
  };

  if (!courseId) {
    return (
      <div className="text-center py-12 text-muted">
        Select a course to configure lab sessions.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Lab Configuration</h1>
          <p className="text-sm text-muted mt-1">
            Configure theory/lab sessions for practical subjects per class
          </p>
        </div>
        <Button size="sm" variant="secondary" onPress={openWeights}>
          <Icon icon="gravity-ui:chart-bar" width={14} /> See Weights
        </Button>
      </div>

      {/* Step 1: Class selector */}
      <div className="flex items-end gap-4 mb-6">
        <div className="w-[280px]">
          <Select
            className="w-full"
            aria-label="Select Class"
            selectedKey={selectedClassId}
            onSelectionChange={(key) => {
              if (key !== null) setSelectedClassId(String(key));
            }}
            placeholder="Select a class..."
          >
            <Label>Class / Division</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {filteredClasses.map((c) => (
                  <ListBox.Item
                    key={String(c.id)}
                    id={String(c.id)}
                    textValue={c.name}
                  >
                    {c.name}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12 text-muted text-sm">
          Loading assignments...
        </div>
      )}

      {/* Step 2: Subject cards */}
      {!loading && selectedClassId && (
        <div className="mb-6">
          {assignmentsList.length === 0 ? (
            <div className="text-center py-8 text-muted text-sm border border-dashed border-border rounded-lg">
              No practical/both subjects assigned to this class.
              <br />
              <span className="text-xs">
                Assign subjects in the Matrix page first.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {assignmentsList.map((a) => {
                const isSelected =
                  selectedAssignment?.assignmentId === a.assignmentId;
                return (
                  <button
                    key={a.assignmentId}
                    onClick={() => selectAssignment(a)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-white hover:border-primary/30 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-sm">
                          {a.subjectShortCode}
                        </div>
                        <div className="text-xs text-muted mt-0.5 truncate max-w-[200px]">
                          {a.subjectName}
                        </div>
                      </div>
                      <Chip className="text-[10px] shrink-0">{a.subjectType}</Chip>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                      <span className="font-mono">{a.subjectCode}</span>
                      <span>•</span>
                      <span>{a.subjectCredit} credits</span>
                      <span>•</span>
                      <span className="font-mono text-primary">
                        {a.facultyCode}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Session Configuration */}
      {selectedAssignment && (
        <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
          {/* Subject header */}
          <div className="p-4 bg-surface-alt border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-base">
                {selectedAssignment.subjectShortCode} —{" "}
                {selectedAssignment.subjectName}
              </h2>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                <span>Code: {selectedAssignment.subjectCode}</span>
                <span>•</span>
                <span>Credits: {selectedAssignment.subjectCredit}</span>
                <span>•</span>
                <span>Type: {selectedAssignment.subjectType}</span>
                <span>•</span>
                <span>Faculty: {selectedAssignment.facultyCode}</span>
              </div>
            </div>
            <div className="text-right">
              <div
                className={`text-lg font-bold font-mono ${
                  remaining === 0
                    ? "text-success"
                    : remaining > 0
                    ? "text-warning"
                    : "text-danger"
                }`}
              >
                {configuredCount}/{requiredCredits}
              </div>
              <div className="text-[10px] text-muted">
                {remaining === 0
                  ? "Fully configured"
                  : remaining > 0
                  ? `${remaining} remaining`
                  : `${Math.abs(remaining)} over-allocated`}
              </div>
            </div>
          </div>

          {/* Session rows */}
          <div className="p-4">
            <ErrorAlert message={error} className="mb-4" />

            <div className="space-y-3">
              {sessions.map((session, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-alt/50"
                >
                  {/* Row number */}
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {idx + 1}
                  </div>

                  {/* Session type */}
                  <div className="w-[140px] shrink-0">
                    <Select
                      className="w-full"
                      aria-label={`Session ${idx + 1} type`}
                      selectedKey={session.sessionType}
                      onSelectionChange={(key) => {
                        if (key !== null)
                          updateSession(idx, "sessionType", String(key));
                      }}
                    >
                      <Label className="sr-only">Type</Label>
                      <Select.Trigger className="h-9 text-sm">
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item key="Theory" id="Theory" textValue="Theory">
                            Theory
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item key="Lab" id="Lab" textValue="Lab">
                            Lab
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>

                  {/* Lab room (only for Lab type) */}
                  {session.sessionType === "Lab" ? (
                    <>
                      <div className="w-[180px] shrink-0">
                        <Select
                          className="w-full"
                          aria-label={`Session ${idx + 1} room`}
                          selectedKey={
                            session.roomId ? String(session.roomId) : undefined
                          }
                          onSelectionChange={(key) => {
                            if (key !== null)
                              updateSession(idx, "roomId", Number(key));
                          }}
                          placeholder="Select Lab..."
                        >
                          <Label className="sr-only">Room</Label>
                          <Select.Trigger className="h-9 text-sm">
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {labs.map((lab) => (
                                <ListBox.Item
                                  key={String(lab.id)}
                                  id={String(lab.id)}
                                  textValue={lab.name}
                                >
                                  {lab.name}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </div>

                      <div className="w-[140px] shrink-0">
                        <Select
                          className="w-full"
                          aria-label={`Session ${idx + 1} duration`}
                          selectedKey={String(session.durationSlots)}
                          onSelectionChange={(key) => {
                            if (key !== null)
                              updateSession(
                                idx,
                                "durationSlots",
                                Number(key)
                              );
                          }}
                        >
                          <Label className="sr-only">Duration</Label>
                          <Select.Trigger className="h-9 text-sm">
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              <ListBox.Item
                                key="1"
                                id="1"
                                textValue="1 Slot"
                              >
                                1 Slot
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                              <ListBox.Item
                                key="2"
                                id="2"
                                textValue="2 Slots (Continuous)"
                              >
                                2 Slots (Continuous)
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 text-xs text-muted italic">
                      1 slot • No room required
                    </div>
                  )}

                  {/* Remove button */}
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    onPress={() => removeSession(idx)}
                    aria-label="Remove session"
                    className="hover:text-danger shrink-0"
                  >
                    <Icon icon="gravity-ui:xmark" width={14} />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add session + Save */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <Button
                size="sm"
                variant="secondary"
                onPress={addSession}
                isDisabled={configuredCount >= requiredCredits}
              >
                <Icon icon="gravity-ui:plus" width={14} /> Add Session
              </Button>

              <div className="flex items-center gap-3">
                {!isValid && configuredCount > 0 && (
                  <span className="text-xs text-danger">
                    {hasLabWithoutRoom
                      ? "Lab sessions require a room"
                      : remaining !== 0
                      ? `Sessions must equal ${requiredCredits} credits`
                      : ""}
                  </span>
                )}
                <Button
                  size="sm"
                  onPress={handleSave}
                  isDisabled={!isValid || saving}
                >
                  {saving ? "Saving..." : "Save Configuration"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lab Weights Modal */}
      <Modal.Backdrop isOpen={showWeights} onOpenChange={setShowWeights}>
        <Modal.Container placement="center">
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Lab Weights</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-xs text-muted mb-3">
                Total lecture slots assigned per lab across all classes. A 2-slot continuous lab counts as 2 lectures.
              </p>
              {weightsLoading ? (
                <div className="text-center py-8 text-muted text-sm">Loading...</div>
              ) : labWeights.length === 0 ? (
                <div className="text-center py-8 text-muted text-sm border border-dashed border-border rounded-lg">
                  No lab sessions configured yet.
                </div>
              ) : (
                <Table>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Lab weights summary" className="min-w-[300px]">
                      <Table.Header>
                        <Table.Column isRowHeader>Lab Name</Table.Column>
                        <Table.Column className="text-end w-36">Total Lectures</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {labWeights.map((lw) => (
                          <Table.Row key={lw.name} id={lw.name}>
                            <Table.Cell>
                              <Tooltip>
                                <Tooltip.Trigger>
                                  <span className="font-mono font-semibold cursor-default">{lw.name}</span>
                                </Tooltip.Trigger>
                                <Tooltip.Content>
                                  {lw.details.length > 0 ? (
                                    <div className="text-xs space-y-1 py-1 max-w-[200px]">
                                      {lw.details.map((d, i) => (
                                        <div key={i} className="flex justify-between gap-3">
                                          <span className="font-medium">{d.className} / {d.subjectShortCode}</span>
                                          <span className="text-muted">{d.slots}L</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs">No sessions</span>
                                  )}
                                </Tooltip.Content>
                              </Tooltip>
                            </Table.Cell>
                            <Table.Cell className="text-end">
                              <span className={`font-bold font-mono ${lw.totalSlots > 0 ? "text-primary" : "text-muted"}`}>
                                {lw.totalSlots}
                              </span>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={() => setShowWeights(false)} size="sm">
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
