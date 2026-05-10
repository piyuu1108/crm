"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button, Tooltip, Select, ListBox, Label, Chip, Table, Spinner, Modal } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useDataContext } from "@/contexts/DataContext";
import { ErrorAlert } from "@/components/ui/Alerts";

interface MatrixCell {
  classId: number; className: string; divisionNumber: number;
  assignmentId: number | null; facultyId: number | null; facultyCode: string | null; facultyName: string | null;
  workload: { name: string; code: string; totalLoad: number; limit: number; assignments: { subjectShortCode: string; className: string }[] } | null;
  isBlocked?: boolean;
}
interface MatrixRow {
  subjectId: number; subjectCode: string; subjectName: string; subjectShortCode: string;
  subjectCredit: number; subjectType: string; semester: number; cells: MatrixCell[];
}
interface MatrixData {
  matrix: MatrixRow[]; classes: { id: number; name: string; divisionNumber: number; specShortCode: string; isDummy?: boolean }[];
  workloadLimit: number; facultyWorkloads: Record<number, any>;
}
interface SearchResult {
  id: number; name: string; code: string; totalLoad: number; workloadLimit: number;
}

export default function AssignmentsPage() {
  const { courseId, allFaculty, workloadLimit: ctxWorkloadLimit } = useDataContext();
  const [semester, setSemester] = useState<string>("all");
  const [data, setData] = useState<MatrixData | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeCell, setActiveCell] = useState<{ subjectId: number; classId: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [detailedFaculty, setDetailedFaculty] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchCacheRef = useRef<Map<string, SearchResult[]>>(new Map());
  const searchCounterRef = useRef(0); // guards against stale async responses

  const fetchMatrix = useCallback(async (isBg = false) => {
    if (!courseId) return;
    if (isBg !== true) setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/assignments/matrix?courseId=${courseId}&semester=${semester}`);
      const json = await res.json();
      if (res.ok) setData(json);
      else setError(json.error || "Failed to load matrix");
    } catch { setError("Network error"); }
    finally { if (isBg !== true) setLoading(false); }
  }, [courseId, semester]);

  useEffect(() => { fetchMatrix(); }, [fetchMatrix]);

  // Clear search cache when course changes
  useEffect(() => { searchCacheRef.current.clear(); }, [courseId]);

  // Faculty search — fast-path + debounced API
  useEffect(() => {
    if (!searchQuery || !courseId) {
      setSearchResults([]); setSearchLoading(false);
      return;
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) { setSearchResults([]); setSearchLoading(false); return; }

    // Fast path: check local DataContext cache for exact code matches
    const localMatches = allFaculty
      .filter(f => f.courseId === courseId && (
        f.code.toLowerCase().includes(q) || f.name.toLowerCase().includes(q)
      ))
      .slice(0, 10)
      .map(f => ({
        id: f.id, name: f.name, code: f.code,
        totalLoad: f.totalLoad, workloadLimit: ctxWorkloadLimit,
      }));

    // If we have local matches, show them instantly (no debounce)
    if (localMatches.length > 0) {
      setSearchResults(localMatches);
      setSelectedIdx(0);
      setSearchLoading(false);
      return; // Local cache is sufficient — skip API call
    }

    // Check in-memory search cache
    const cacheKey = `${courseId}:${q}`;
    const cached = searchCacheRef.current.get(cacheKey);
    if (cached) {
      setSearchResults(cached); setSelectedIdx(0); setSearchLoading(false);
      return;
    }

    // Debounced API search (for names not in local cache)
    setSearchLoading(true);
    const requestId = ++searchCounterRef.current;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/faculty/search?q=${encodeURIComponent(searchQuery)}&courseId=${courseId}`,
          { signal: controller.signal }
        );
        const json = await res.json();
        // Only apply if this is still the latest request
        if (requestId === searchCounterRef.current && Array.isArray(json)) {
          searchCacheRef.current.set(cacheKey, json);
          setSearchResults(json); setSelectedIdx(0);
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") console.error("Search failed:", err);
      } finally {
        if (requestId === searchCounterRef.current) setSearchLoading(false);
      }
    }, 150);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [searchQuery, courseId, allFaculty, ctxWorkloadLimit]);

  // Build dynamic columns (memoized) — MUST be before any conditional return
  const columns = useMemo((): { id: string; label: string; subLabel?: string; width?: string }[] => [
    { id: "code", label: "Code", width: "w-[72px]" },
    { id: "subject", label: "Subject", width: "w-[180px]" },
    { id: "sem", label: "Sem", width: "w-[64px]" },
    { id: "cr", label: "CR", width: "w-[56px]" },
    ...(data?.classes ?? []).map(cls => ({
      id: `div-${cls.id}`,
      label: `DIV ${cls.divisionNumber}`,
      subLabel: cls.isDummy ? "—" : cls.specShortCode,
      width: "w-[140px]",
    })),
  ], [data?.classes]);

  const mergedWorkloads = useMemo(() => {
    if (!data || !data.matrix || !courseId) return [];
    
    const workloadMap = new Map<string, any>();
    
    // 1. Initialize with all faculty for this course
    allFaculty.forEach(f => {
      if (f.courseId === courseId) {
        workloadMap.set(f.code, {
          name: f.name,
          code: f.code,
          totalLoad: f.totalLoad || 0,
          limit: ctxWorkloadLimit,
          assignments: []
        });
      }
    });

    // 2. Merge existing data from DB
    const workloads = Object.values(data.facultyWorkloads || {}) as any[];
    workloads.forEach(w => {
      if (w?.code) {
        workloadMap.set(w.code, { ...workloadMap.get(w.code), ...w });
      }
    });
    
    // 3. Apply optimistic updates from matrix
    data.matrix.forEach(row => {
      row.cells.forEach(cell => {
        if (cell.facultyCode && cell.workload) {
          workloadMap.set(cell.facultyCode, { 
            ...workloadMap.get(cell.facultyCode), 
            ...cell.workload 
          });
        }
      });
    });

    return Array.from(workloadMap.values()).sort((a, b) => {
      if (b.totalLoad !== a.totalLoad) {
        return b.totalLoad - a.totalLoad;
      }
      return a.code.localeCompare(b.code);
    });
  }, [data, courseId, allFaculty, ctxWorkloadLimit]);

  const handleExportCSV = useCallback(() => {
    if (!data || !data.matrix || isExporting) return;
    setIsExporting(true);

    // Use setTimeout to allow UI to render the loading state
    setTimeout(() => {
      try {
        const divColumns = (data.classes || []).map(c => `DIV${c.divisionNumber}`);
        const headers = ['Subject Code', 'Short', 'Subject Name', 'Semester', 'Credits', ...divColumns];
        let csvContent = '\uFEFF'; // UTF-8 BOM

        const escapeCell = (cell: string | number | null | undefined) => {
          if (cell === null || cell === undefined) return '';
          const str = String(cell);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        csvContent += headers.map(escapeCell).join(',') + '\n';

        data.matrix.forEach(row => {
          const rowData: any[] = [
            row.subjectCode,
            row.subjectShortCode,
            row.subjectName,
            row.semester,
            row.subjectCredit
          ];

          (data.classes || []).forEach(cls => {
            const cell = row.cells.find(c => c.classId === cls.id);
            rowData.push(cell?.facultyCode || '');
          });

          csvContent += rowData.map(escapeCell).join(',') + '\n';
        });

        // Faculty Summary
        csvContent += '\n\n'; // Empty rows

        const workloads = Object.values(data.facultyWorkloads || {}) as any[];
        
        // Merge optimistic updates
        const workloadMap = new Map<string, any>();
        workloads.forEach(w => {
            if (w?.code) workloadMap.set(w.code, { ...w });
        });
        
        data.matrix.forEach(row => {
            row.cells.forEach(cell => {
                if (cell.facultyCode && cell.workload) {
                    workloadMap.set(cell.facultyCode, { ...cell.workload });
                }
            });
        });

        const mergedWorkloads = Array.from(workloadMap.values());

        let maxAssigns = 0;
        mergedWorkloads.forEach(fac => {
          if (fac.assignments && fac.assignments.length > maxAssigns) {
            maxAssigns = fac.assignments.length;
          }
        });

        const facHeaders = ['Faculty Code', 'Faculty Name'];
        for (let i = 1; i <= maxAssigns; i++) {
          facHeaders.push(`Assign ${i}`);
        }
        facHeaders.push('Total Load');

        csvContent += facHeaders.map(escapeCell).join(',') + '\n';

        mergedWorkloads.forEach(fac => {
          const rowData: any[] = [fac.code, fac.name];
          const assigns = fac.assignments || [];
          for (let i = 0; i < maxAssigns; i++) {
            const a = assigns[i];
            rowData.push(a ? `${a.className}/${a.subjectShortCode}` : '');
          }
          rowData.push(fac.totalLoad || 0);
          csvContent += rowData.map(escapeCell).join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const dateStr = new Date().toISOString().split('T')[0];
        let courseIdent = String(courseId);
        if (data.classes && data.classes.length > 0) {
            const match = data.classes[0].name.match(/[A-Z]+/);
            if (match) courseIdent = match[0];
        }

        link.href = url;
        link.setAttribute('download', `assignments_${courseIdent}_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Export failed:', err);
      } finally {
        setIsExporting(false);
      }
    }, 0);
  }, [data, courseId, isExporting]);

  // ─── Event handlers (stable references) ──────────────────
  const handleCellClick = useCallback((subjectId: number, classId: number) => {
    setActiveCell({ subjectId, classId });
    setSearchQuery(""); setSearchResults([]); setSelectedIdx(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleAssign = useCallback(async (facultyId: number) => {
    if (!activeCell) return;
    const chosen = searchResults.find(r => r.id === facultyId);
    const capturedCell = activeCell; // Capture before clearing state
    // Optimistic update
    if (data && chosen) {
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          matrix: prev.matrix.map(row => {
            if (row.subjectId !== capturedCell.subjectId) return row;
            return {
              ...row,
              cells: row.cells.map(cell => {
                if (cell.classId !== capturedCell.classId) return cell;
                return { ...cell, facultyId, facultyCode: chosen.code, facultyName: chosen.name, workload: { name: chosen.name, code: chosen.code, totalLoad: chosen.totalLoad + row.subjectCredit, limit: chosen.workloadLimit, assignments: [] } };
              }),
            };
          }),
        };
      });
    }
    setActiveCell(null); setSearchQuery(""); setSearchResults([]);
    // Fire API in background, then reconcile
    setIsSaving(true);
    try {
      await fetch("/api/assignments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: capturedCell.subjectId, classId: capturedCell.classId, facultyId }),
      });
    } catch { /* network error — matrix will reconcile on refetch */ }
    await fetchMatrix(true);
    setIsSaving(false);
  }, [activeCell, searchResults, data, fetchMatrix]);

  const handleRemove = useCallback(async (subjectId: number, classId: number) => {
    // Optimistic update
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        matrix: prev.matrix.map(row => {
          if (row.subjectId !== subjectId) return row;
          return {
            ...row,
            cells: row.cells.map(cell => {
              if (cell.classId !== classId) return cell;
              return { ...cell, assignmentId: null, facultyId: null, facultyCode: null, facultyName: null, workload: null };
            }),
          };
        }),
      };
    });
    setIsSaving(true);
    try {
      await fetch(`/api/assignments?subjectId=${subjectId}&classId=${classId}`, { method: "DELETE" });
    } catch { /* network error */ }
    await fetchMatrix(true);
    setIsSaving(false);
  }, [fetchMatrix]);

  const handleCellKeyDown = useCallback((e: React.KeyboardEvent, subjectId: number, classId: number, hasAssignment: boolean) => {
    if ((e.key === "Delete" || e.key === "Backspace") && hasAssignment && !activeCell) {
      e.preventDefault(); handleRemove(subjectId, classId);
    } else if (e.key === "Enter" && !activeCell) {
      e.preventDefault(); handleCellClick(subjectId, classId);
    }
  }, [activeCell, handleRemove, handleCellClick]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, searchResults.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && searchResults[selectedIdx]) { e.preventDefault(); handleAssign(searchResults[selectedIdx].id); }
    else if (e.key === "Escape") { setActiveCell(null); setSearchQuery(""); }
  }, [searchResults, selectedIdx, handleAssign]);

  // ─── Conditional render (AFTER all hooks) ────────────────
  if (!courseId) {
    return <div className="text-center py-12 text-muted">Select a course to view the assignment matrix.</div>;
  }

  /** Render inner content of an assignment cell */
  const renderCellContent = (row: MatrixRow, cell: MatrixCell) => {
    const isActive = activeCell?.subjectId === row.subjectId && activeCell?.classId === cell.classId;

    return (
      <div
        className={`matrix-cell w-full h-full rounded-md border relative ${
          cell.isBlocked
            ? "border-dashed border-neutral-200 bg-neutral-50 matrix-cell--blocked"
            : cell.facultyCode
              ? "border-transparent bg-transparent"
              : "border-dashed border-neutral-200 cursor-pointer group hover:border-primary/40"
        }`}
        tabIndex={cell.isBlocked ? -1 : 0}
        onClick={() => !cell.isBlocked && !isActive && handleCellClick(row.subjectId, cell.classId)}
        onKeyDown={(e) => !cell.isBlocked && handleCellKeyDown(e, row.subjectId, cell.classId, !!cell.facultyCode)}
      >
        {isActive && !cell.isBlocked ? (
          <div className="absolute inset-[-1px] z-20 flex items-center justify-center bg-white shadow-sm ring-1 ring-primary rounded-md">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onBlur={() => setTimeout(() => { setActiveCell(null); setSearchQuery(""); }, 200)}
              placeholder="Search..."
              className="w-full h-full text-[11px] text-center border-none bg-transparent outline-none focus:ring-0 rounded-md"
              autoFocus
            />
            {(searchResults.length > 0 || searchLoading || (searchQuery.length > 0 && !searchLoading)) && (
              <div className="absolute top-full left-[-1px] w-[220px] mt-1 bg-white border border-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                {searchLoading ? (
                  <div className="px-3 py-2 text-[10px] text-muted text-center">Searching…</div>
                ) : searchResults.length === 0 ? (
                  <div className="px-3 py-2 text-[10px] text-muted text-center">No faculty found</div>
                ) : (
                  searchResults.map((r, idx) => {
                    const ratio = r.workloadLimit > 0 ? r.totalLoad / r.workloadLimit : 0;
                    return (
                      <button
                        key={r.id}
                        className={`w-full text-left px-2 py-1.5 text-[10px] hover:bg-surface-alt flex items-center justify-between ${idx === selectedIdx ? "bg-primary/5" : ""}`}
                        onMouseDown={(e) => { e.preventDefault(); handleAssign(r.id); }}
                      >
                        <span>
                          <span className="font-mono font-semibold">{r.code}</span>{" "}
                          <span className="text-muted truncate max-w-[90px] inline-block align-bottom">— {r.name}</span>
                        </span>
                        <span className={`font-mono ${ratio >= 1 ? "text-danger" : ratio >= 0.6 ? "text-warning" : "text-success"}`}>
                          {r.totalLoad}/{r.workloadLimit}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        ) : cell.facultyCode ? (
          <div className="w-full px-2 py-1 relative">
            <Tooltip>
              <Tooltip.Trigger>
                <div className="text-[11px] font-semibold text-sky-700 cursor-default">{cell.facultyCode}</div>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <div className="info-tooltip">
                  <p className="font-medium">{cell.workload?.name ?? "Unknown"}</p>
                  <p>Current Load: {cell.workload?.totalLoad ?? 0} / {cell.workload?.limit ?? 0}</p>
                  <p>Remaining: {(cell.workload?.limit ?? 0) - (cell.workload?.totalLoad ?? 0)}</p>
                  {(cell.workload?.assignments?.length ?? 0) > 0 && (
                    <div className="mt-1 pt-1 border-t border-border/50">
                      <p className="text-muted text-[10px] mb-0.5">Assignments:</p>
                      {cell.workload!.assignments.map((a, i) => (
                        <p key={i} className="text-[10px]">• {a.subjectShortCode} → {a.className}</p>
                      ))}
                    </div>
                  )}
                </div>
              </Tooltip.Content>
            </Tooltip>

            {/* Workload bar */}
            {cell.workload && cell.workload.limit > 0 && (
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-neutral-200/50">
                <div
                  className={`h-full rounded-full ${
                    cell.workload.totalLoad / cell.workload.limit >= 1
                      ? "bg-red-500"
                      : cell.workload.totalLoad / cell.workload.limit >= 0.6
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, (cell.workload.totalLoad / cell.workload.limit) * 100)}%` }}
                />
              </div>
            )}

            {/* Clear button on hover */}
            <button
              onClick={(e) => { e.stopPropagation(); handleRemove(row.subjectId, cell.classId); }}
              className="absolute top-[2px] right-[2px] opacity-0 group-hover:opacity-100 p-0.5 rounded-sm hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-opacity"
            >
              <Icon icon="gravity-ui:xmark" width={10} />
            </button>
          </div>
        ) : cell.isBlocked ? (
          <div className="text-[11px] text-neutral-400 select-none">Blocked</div>
        ) : (
          <div className="text-[11px] text-neutral-400 select-none opacity-0 group-hover:opacity-100 transition-opacity">Assign</div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Assignment Matrix</h1>
          <p className="text-sm text-muted mt-0.5">Assign faculty to subject-class cells</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            className="w-[130px]"
            aria-label="Semester"
            selectedKey={semester}
            onSelectionChange={(key) => { if (key !== null) setSemester(String(key)); }}
          >
            <Label className="sr-only">Semester</Label>
            <Select.Trigger className="h-8 text-sm">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item key="all" id="all" textValue="All Semesters">All<ListBox.ItemIndicator /></ListBox.Item>
                {[1,2,3,4,5,6,7,8].map(s => (
                  <ListBox.Item key={String(s)} id={String(s)} textValue={`Sem ${s}`}>Sem {s}<ListBox.ItemIndicator /></ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <Button size="sm" variant="secondary" onPress={() => fetchMatrix()}>
            <Icon icon="gravity-ui:arrows-rotate-right" width={14} />Refresh
          </Button>
          <Button 
            size="sm" 
            variant="primary"
            onPress={handleExportCSV}
            isPending={isExporting}
            isDisabled={!data || !data.matrix}
          >
            {({isPending}) => (
              <>
                {isPending ? <Spinner color="current" size="sm" /> : <Icon icon="gravity-ui:file-arrow-down" width={14} />}
                <span className="ml-1.5">{isPending ? "Exporting..." : "Export CSV"}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <ErrorAlert message={error} className="mb-4" />
      {loading && <div className="text-center py-12 text-muted">Loading matrix...</div>}
      
      {isSaving && <div className="text-right pb-2 text-primary text-xs font-medium animate-pulse">Saving matrix...</div>}

      {data && !loading && (
        <div className="flex gap-4 items-start">
          <div className="flex-1 overflow-hidden min-w-0">
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="Assignment Matrix" className="min-w-[1072px]">
                  <Table.Header>
                    {columns.map((col) => (
                      <Table.Column
                        key={col.id}
                        id={col.id}
                        isRowHeader={col.id === "code"}
                        className={`${col.width || ""} ${
                          col.id === "sem" || col.id === "cr" ? "text-center" : ""
                        } ${col.id.startsWith("div-") ? "text-center" : ""}`}
                      >
                        {col.subLabel ? (
                          <div className="flex flex-col items-center leading-none">
                            <span>{col.label}</span>
                            <span className="text-[10px] font-normal text-muted/60 mt-0.5">{col.subLabel}</span>
                          </div>
                        ) : (
                          col.label
                        )}
                      </Table.Column>
                    ))}
                  </Table.Header>
                  <Table.Body
                    renderEmptyState={() => (
                      <div className="flex items-center justify-center py-12 text-muted text-sm">
                        No subjects found for this course and semester.
                      </div>
                    )}
                  >
                    {(data.matrix ?? []).map((row) => (
                      <Table.Row key={row.subjectId} id={row.subjectId} className="group/row">
                        {/* Code */}
                        <Table.Cell className="font-mono text-[11px] truncate">
                          {row.subjectCode}
                        </Table.Cell>

                        {/* Subject */}
                        <Table.Cell className="truncate text-xs font-medium text-accent">
                          <Tooltip>
                            <Tooltip.Trigger>
                              <span className="cursor-default">{row.subjectName}</span>
                            </Tooltip.Trigger>
                            <Tooltip.Content>
                              <div className="info-tooltip">
                                <p className="font-medium">{row.subjectShortCode}</p>
                                <p>Code: {row.subjectCode}</p>
                                <p>Credits: {row.subjectCredit}</p>
                                <p>Type: {row.subjectType}</p>
                              </div>
                            </Tooltip.Content>
                          </Tooltip>
                        </Table.Cell>

                        {/* Sem */}
                        <Table.Cell className="text-center font-mono text-[11px] text-muted">
                          {row.semester}
                        </Table.Cell>

                        {/* CR */}
                        <Table.Cell className="text-center font-mono text-[11px] text-muted">
                          {row.subjectCredit}
                        </Table.Cell>

                        {/* DIV cells */}
                        {(row.cells ?? []).map((cell) => (
                          <Table.Cell key={cell.classId} className="p-1.5 align-middle">
                            {renderCellContent(row, cell)}
                          </Table.Cell>
                        ))}
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>

            {/* Legend */}
            <div className="mt-3 flex items-center gap-6 text-xs text-muted">
              <span className="flex items-center gap-1.5"><Chip className="h-4 text-[10px] bg-emerald-50 text-emerald-600">Low</Chip></span>
              <span className="flex items-center gap-1.5"><Chip className="h-4 text-[10px] bg-amber-50 text-amber-600">Medium</Chip></span>
              <span className="flex items-center gap-1.5"><Chip className="h-4 text-[10px] bg-red-50 text-red-600">At/Over limit</Chip></span>
              <span className="ml-auto">Click cell to assign • Delete/Backspace to remove • Hover for details</span>
            </div>
          </div>

          <div className="w-[300px] shrink-0 border border-border rounded-xl bg-white shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-200px)] sticky top-4">
            <div className="p-3 bg-neutral-50 border-b border-border font-semibold text-sm text-foreground">Faculty Load Summary</div>
            <div className="overflow-y-auto p-0 flex flex-col">
              <div className="flex bg-neutral-50/50 sticky top-0 z-10 border-b border-border">
                <div className="p-2 pl-3 font-medium text-muted flex-1 text-xs">Faculty Code</div>
                <div className="p-2 pr-3 font-medium text-muted text-right text-xs">Load</div>
              </div>
              <div className="flex flex-col">
                {mergedWorkloads.map(fac => (
                  <Tooltip key={fac.code}>
                    <Tooltip.Trigger>
                      <div 
                        className="flex items-center justify-between border-b border-border/50 hover:bg-neutral-50 cursor-pointer transition-colors p-2 pl-3 pr-3"
                        onClick={() => setDetailedFaculty(fac)}
                      >
                        <div className="font-mono text-sky-700 font-medium text-xs">{fac.code}</div>
                        <div className="text-right text-xs">
                          <span className={`font-medium ${fac.totalLoad >= fac.limit ? "text-danger" : fac.totalLoad >= fac.limit * 0.8 ? "text-warning" : "text-success"}`}>
                            {fac.totalLoad}
                          </span>
                          <span className="text-muted"> / {fac.limit}</span>
                        </div>
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <div className="px-1 py-0.5 text-xs font-semibold">{fac.name}</div>
                    </Tooltip.Content>
                  </Tooltip>
                ))}
                {mergedWorkloads.length === 0 && (
                  <div className="p-4 text-center text-muted text-xs">No faculty assigned</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Faculty Details Modal */}
      <Modal>
        <Modal.Backdrop isOpen={!!detailedFaculty} onOpenChange={(open) => !open && setDetailedFaculty(null)}>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[450px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Faculty Details</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="py-4">
                {detailedFaculty && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-surface-alt p-3 rounded-lg border border-border/50">
                      <div>
                        <div className="font-semibold text-base">{detailedFaculty.name}</div>
                        <div className="text-sm font-mono text-sky-700">{detailedFaculty.code}</div>
                        {detailedFaculty.assignments && detailedFaculty.assignments.length > 0 && (() => {
                          const semCounts = detailedFaculty.assignments.reduce((acc: any, curr: any) => {
                            if (curr.semester && curr.credit) {
                              acc[curr.semester] = (acc[curr.semester] || 0) + curr.credit;
                            }
                            return acc;
                          }, {});
                          const semEntries = Object.entries(semCounts).filter(([_, credit]) => (credit as number) > 0);
                          
                          if (semEntries.length === 0) return null;
                          
                          return (
                            <div className="flex flex-wrap gap-2 mt-2.5">
                              {semEntries.map(([sem, credit]) => (
                                <span key={sem} className="bg-white border border-border/60 text-muted px-1.5 py-0.5 rounded text-[10px] font-mono font-medium shadow-xs">
                                  SEM{sem}:{String(credit)}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted mb-0.5">Total Load</div>
                        <div className={`font-semibold text-lg leading-none ${detailedFaculty.totalLoad >= detailedFaculty.limit ? "text-danger" : detailedFaculty.totalLoad >= detailedFaculty.limit * 0.8 ? "text-warning" : "text-success"}`}>
                          {detailedFaculty.totalLoad} <span className="text-muted text-sm font-normal">/ {detailedFaculty.limit}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2 border-b border-border pb-1 text-foreground">Current Assignments</h4>
                      {detailedFaculty.assignments && detailedFaculty.assignments.length > 0 ? (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {detailedFaculty.assignments.map((a: any, i: number) => (
                            <div key={i} className="bg-white p-2.5 rounded-md border border-border flex justify-between items-center text-sm hover:border-primary/30 transition-colors shadow-xs">
                              <span className="font-semibold text-accent">{a.subjectShortCode}</span>
                              <span className="text-muted font-medium bg-neutral-100 px-2 py-0.5 rounded-full text-[11px]">{a.className}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted p-4 text-center bg-neutral-50 rounded-md border border-border border-dashed">
                          No assignments yet
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button slot="close" variant="secondary" className="w-full">
                  Close
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
