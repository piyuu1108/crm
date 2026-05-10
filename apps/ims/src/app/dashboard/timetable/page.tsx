"use client";
// ─────────────────────────────────────────────────────────────────────────────
// Timetable Generation & Viewer Page
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Chip,
  Select,
  ListBox,
  Modal,
  Spinner,
  Tabs,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useDataContext } from "@/contexts/DataContext";
import {
  useTimetableGenerator,
  STEP_LABELS,
  type GenerationStep,
} from "@/lib/use-timetable-generator";
import TimetableGrid from "./TimetableGrid";

// Generation progress steps in order
const PROGRESS_STEPS: GenerationStep[] = [
  "fetching_payload",
  "building_entities",
  "placing_labs",
  "placing_theory",
  "repairing_conflicts",
  "optimizing_score",
  "finalizing",
  "saving",
];

type ViewTab = "class" | "faculty" | "lab";

export default function TimetablePage() {
  const { courseId, courses } = useDataContext();
  const {
    step,
    result,
    error,
    isGenerating,
    generate,
    loadBest,
    loadExisting,
  } = useTimetableGenerator();

  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
  const [selectedLab, setSelectedLab] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<ViewTab>("class");
  const [modalOpen, setModalOpen] = useState(false);

  // Load existing timetable from IndexedDB on mount
  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  // Open modal when generation starts, keep open until done/error
  useEffect(() => {
    if (isGenerating) setModalOpen(true);
  }, [isGenerating]);

  // Auto-select first class when result loads
  useEffect(() => {
    if (result?.classTimetables) {
      const keys = Object.keys(result.classTimetables);
      if (keys.length > 0 && !selectedClass) setSelectedClass(keys[0]);
    }
    if (result?.facultyTimetables) {
      const keys = Object.keys(result.facultyTimetables);
      if (keys.length > 0 && !selectedFaculty) setSelectedFaculty(keys[0]);
    }
    if (result?.labTimetables) {
      const keys = Object.keys(result.labTimetables);
      if (keys.length > 0 && !selectedLab) setSelectedLab(keys[0]);
    }
  }, [result, selectedClass, selectedFaculty, selectedLab]);

  // Current course name
  const courseName = useMemo(
    () => courses.find((c) => c.id === courseId)?.name || "Course",
    [courses, courseId]
  );

  // Lists for selectors
  const classList = useMemo(
    () => (result ? Object.keys(result.classTimetables).sort() : []),
    [result]
  );
  const facultyList = useMemo(
    () => (result ? Object.keys(result.facultyTimetables).sort() : []),
    [result]
  );
  const labList = useMemo(
    () => (result ? Object.keys(result.labTimetables).sort() : []),
    [result]
  );

  const handleGenerate = () => {
    if (!courseId) return;
    if (result && !window.confirm("This will replace the current timetable. Are you sure you want to regenerate?")) return;
    setSelectedClass(null);
    setSelectedFaculty(null);
    setSelectedLab(null);
    generate(courseId, courseName);
  };

  const handleLoadBest = () => {
    if (!courseId) return;
    setSelectedClass(null);
    setSelectedFaculty(null);
    setSelectedLab(null);
    loadBest(courseId, courseName);
  };

  // Current grid based on tab + selection
  const currentGrid = useMemo(() => {
    if (!result) return null;
    if (viewTab === "class" && selectedClass)
      return result.classTimetables[selectedClass] || null;
    if (viewTab === "faculty" && selectedFaculty)
      return result.facultyTimetables[selectedFaculty] || null;
    if (viewTab === "lab" && selectedLab)
      return result.labTimetables[selectedLab] || null;
    return null;
  }, [result, viewTab, selectedClass, selectedFaculty, selectedLab]);

  const currentTitle = useMemo(() => {
    if (viewTab === "class") return selectedClass || "";
    if (viewTab === "faculty") return selectedFaculty || "";
    if (viewTab === "lab") return selectedLab || "";
    return "";
  }, [viewTab, selectedClass, selectedFaculty, selectedLab]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Timetable</h1>
          <p className="text-sm text-muted mt-1">
            Generate and view class timetables
          </p>
        </div>
        <div className="flex items-center gap-3">
          {result && (
            <div className="flex items-center gap-2 mr-2">
              <Chip size="sm" variant="soft" color="success">
                Score: {result.score}
              </Chip>
              <Chip size="sm" variant="soft" color="accent">
                {result.metadata.placedTasks}/{result.metadata.totalTasks} placed
              </Chip>
              <Chip size="sm" variant="soft">
                {result.metadata.durationMs}ms
              </Chip>
            </div>
          )}
          {/* <Button
            variant="secondary"
            onPress={handleLoadBest}
            isDisabled={isGenerating || !courseId}
          >
            <Icon icon="gravity-ui:database-fill" width={16} />
            Load Best
          </Button> */}
          <Button
            variant="primary"
            onPress={handleGenerate}
            isDisabled={isGenerating || !courseId}
          >
            <Icon icon="gravity-ui:play-fill" width={16} />
            {result ? "Regenerate" : "Generate Timetable"}
          </Button>
        </div>
      </div>

      {/* ── Generation Progress Modal ── */}
      <Modal.Backdrop isOpen={modalOpen} onOpenChange={setModalOpen} isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.Header>
              <Modal.Heading>
                {step === "done"
                  ? "✅ Timetable Generated"
                  : step === "error"
                  ? "❌ Generation Failed"
                  : "Generating Timetable…"}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="space-y-2">
                {PROGRESS_STEPS.map((s, idx) => {
                  const currentIdx = PROGRESS_STEPS.indexOf(step as GenerationStep);
                  const isDone = step === "done" || step === "saving"
                    ? true
                    : currentIdx > idx;
                  const isActive = step === s;

                  return (
                    <div
                      key={s}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                        isActive
                          ? "bg-accent/10 font-medium"
                          : isDone
                          ? "text-success"
                          : "text-muted"
                      }`}
                    >
                      {isActive ? (
                        <Spinner size="sm" />
                      ) : isDone ? (
                        <Icon icon="gravity-ui:circle-check-fill" width={18} className="text-success" />
                      ) : (
                        <Icon icon="gravity-ui:circle" width={18} className="text-border" />
                      )}
                      <span className="text-sm">{STEP_LABELS[s]}</span>
                    </div>
                  );
                })}

                {step === "done" && result && (
                  <div className="mt-4 p-3 rounded-lg bg-success/5 border border-success/20">
                    <div className="text-sm font-medium text-success mb-1">
                      Generation Complete
                    </div>
                    <div className="text-xs text-muted space-y-0.5">
                      <div>Score: {result.score}</div>
                      <div>Tasks: {result.metadata.placedTasks}/{result.metadata.totalTasks}</div>
                      <div>Time: {result.metadata.durationMs}ms</div>
                      <div>Retries: {result.metadata.retries}</div>
                    </div>
                  </div>
                )}

                {step === "error" && error && (
                  <div className="mt-4 p-3 rounded-lg bg-danger/5 border border-danger/20">
                    <div className="text-sm text-danger whitespace-pre-wrap">{error}</div>
                  </div>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              {(step === "done" || step === "error") && (
                <Button
                  variant={step === "done" ? "primary" : "secondary"}
                  className="w-full"
                  onPress={() => setModalOpen(false)}
                >
                  {step === "done" ? "View Timetable" : "Close"}
                </Button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* ── No timetable state ── */}
      {!result && !isGenerating && (
        <Card className="text-center py-16">
          <Card.Content>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/10 flex items-center justify-center">
              <Icon icon="gravity-ui:calendar" width={32} className="text-accent" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No Timetable Generated</h2>
            <p className="text-sm text-muted mb-6 max-w-md mx-auto">
              Click the generate button to create a complete timetable for{" "}
              <strong>{courseName}</strong>. The engine will run entirely in your browser.
            </p>
            <Button variant="primary" size="lg" onPress={handleGenerate} isDisabled={!courseId}>
              <Icon icon="gravity-ui:play-fill" width={18} />
              Generate Timetable
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* ── Timetable Viewer ── */}
      {result && !isGenerating && (
        <div>
          {/* Tab bar + selector */}
          <div className="flex items-center gap-4 mb-4">
            <Tabs
              selectedKey={viewTab}
              onSelectionChange={(key) => setViewTab(key as ViewTab)}
            >
              <Tabs.List>
                <Tabs.Tab id="class">
                  <Icon icon="gravity-ui:layers-3-diagonal" width={15} />
                  <span>Classes</span>
                </Tabs.Tab>
                <Tabs.Tab id="faculty">
                  <Icon icon="gravity-ui:persons" width={15} />
                  <span>Faculty</span>
                </Tabs.Tab>
                <Tabs.Tab id="lab">
                  <Icon icon="gravity-ui:flask" width={15} />
                  <span>Labs</span>
                </Tabs.Tab>
              </Tabs.List>
            </Tabs>

            <div className="ml-auto">
              {viewTab === "class" && (
                <Select
                  className="w-[200px]"
                  aria-label="Select class"
                  selectedKey={selectedClass || undefined}
                  onSelectionChange={(key) => {
                    if (key !== null) setSelectedClass(String(key));
                  }}
                >
                  <Select.Trigger className="h-9 text-sm">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {classList.map((name) => (
                        <ListBox.Item key={name} id={name} textValue={name}>
                          {name}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              )}

              {viewTab === "faculty" && (
                <Select
                  className="w-[200px]"
                  aria-label="Select faculty"
                  selectedKey={selectedFaculty || undefined}
                  onSelectionChange={(key) => {
                    if (key !== null) setSelectedFaculty(String(key));
                  }}
                >
                  <Select.Trigger className="h-9 text-sm">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {facultyList.map((code) => (
                        <ListBox.Item key={code} id={code} textValue={code}>
                          {code}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              )}

              {viewTab === "lab" && (
                <Select
                  className="w-[200px]"
                  aria-label="Select lab"
                  selectedKey={selectedLab || undefined}
                  onSelectionChange={(key) => {
                    if (key !== null) setSelectedLab(String(key));
                  }}
                >
                  <Select.Trigger className="h-9 text-sm">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {labList.map((name) => (
                        <ListBox.Item key={name} id={name} textValue={name}>
                          {name}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              )}
            </div>
          </div>

          {/* Grid */}
          {currentGrid ? (
            <TimetableGrid grid={currentGrid} title={currentTitle} />
          ) : (
            <Card className="text-center py-10">
              <Card.Content>
                <p className="text-sm text-muted">
                  Select a {viewTab} to view its timetable
                </p>
              </Card.Content>
            </Card>
          )}

          {/* Generation info footer */}
          <div className="mt-4 text-xs text-muted flex items-center gap-4">
            <span>Generated: {new Date(result.generatedAt).toLocaleString()}</span>
            <span>•</span>
            <span>Course: {result.courseName}</span>
            <span>•</span>
            <span>Stored locally (IndexedDB)</span>
          </div>
        </div>
      )}
    </div>
  );
}
