import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { ManualTimetableStore, MasterData } from './types/manual-timetable';

export async function exportTimetableToExcel(
  store: ManualTimetableStore,
  masterData: MasterData
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'IMS Timetable Builder';
  wb.created = new Date();

  // Standard times mapping
  const timeSlots = [
    { id: 'lecture1', time: '07:55 AM TO 08:50 AM' },
    { id: 'lecture2', time: '08:50 AM TO 09:40 AM' },
    { id: 'break', time: '10 Minutes Break (09:40 TO 09:50)' },
    { id: 'lecture3', time: '09:50 AM TO 10:40 AM' },
    { id: 'lecture4', time: '10:40 AM TO 11:30 AM' },
    { id: 'lecture5', time: '11:30 AM TO 12:20 PM' }
  ];

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Map to get numeric subject code by subjectId
  const subjectCodeMap = new Map<number, string>();
  masterData.subjects.forEach(s => subjectCodeMap.set(s.id, s.code));

  for (const cls of masterData.classes) {
    const classGrid = store.timetables[cls.id]?.grid;
    // We export all classes, even if empty, to provide templates.

    // Sanitize sheet name
    const sheetName = cls.name.replace(/[*?:\\/[\]]/g, '').substring(0, 31);
    const ws = wb.addWorksheet(sheetName);

    // Page setup
    ws.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      paperSize: 9, // A4
      margins: {
        left: 0.25, right: 0.25,
        top: 0.5, bottom: 0.5,
        header: 0.2, footer: 0.2
      }
    };

    // Columns config
    ws.columns = [
      { width: 22 }, // Time
      { width: 20 }, // Monday
      { width: 20 }, // Tuesday
      { width: 20 }, // Wednesday
      { width: 20 }, // Thursday
      { width: 20 }, // Friday
      { width: 20 }, // Saturday
    ];

    // Styles
    const borderAll: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    const fontBase = { name: 'Times New Roman', size: 11 };
    const fontBold = { ...fontBase, bold: true };
    const alignCenter: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'center', wrapText: true };

    const styleRowCells = (row: ExcelJS.Row, height: number, font: any, isHeader = false) => {
      row.height = height;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber <= 7) {
          cell.font = font;
          cell.alignment = alignCenter;
          cell.border = borderAll;
        }
      });
    };

    // Row 1
    const row1 = ws.getRow(1);
    row1.getCell(1).value = 'Time Table';
    ws.mergeCells(1, 1, 1, 7);
    styleRowCells(row1, 30, { ...fontBold, size: 14 });

    // Row 2
    const row2 = ws.getRow(2);
    row2.getCell(1).value = `${cls.name} - Semester - ${cls.semester} [ DIV - ${cls.divisionNumber} ]`;
    ws.mergeCells(2, 1, 2, 7);
    styleRowCells(row2, 25, { ...fontBold, size: 12 });

    // Row 3 (Headers)
    const row3 = ws.getRow(3);
    row3.values = ['Time', ...dayLabels];
    styleRowCells(row3, 25, { ...fontBold, size: 11 }, true);

    // Data rows
    let rowNum = 4;
    const uniqueSubjects = new Map<string, any>();

    for (const slot of timeSlots) {
      const row = ws.getRow(rowNum);
      row.height = slot.id === 'break' ? 25 : 55;
      
      row.getCell(1).value = slot.time;
      row.getCell(1).font = { ...fontBase, size: 10 };
      row.getCell(1).alignment = alignCenter;
      row.getCell(1).border = borderAll;

      if (slot.id === 'break') {
        row.getCell(1).value = slot.time;
        ws.mergeCells(rowNum, 1, rowNum, 7);
        styleRowCells(row, 25, { ...fontBold, size: 11 });
      } else {
        days.forEach((day, dIdx) => {
          const col = dIdx + 2; 
          const cellData = classGrid?.[day]?.[slot.id];
          const excelCell = row.getCell(col);
          
          excelCell.alignment = alignCenter;
          excelCell.border = borderAll;
          excelCell.font = { ...fontBase, size: 10 };

          if (cellData) {
            const numericCode = subjectCodeMap.get(cellData.subjectId) || "";
            const displaySubject = numericCode ? `${numericCode}-${cellData.subjectShortCode}` : cellData.subjectShortCode;
            
            let text = `${displaySubject} (${cellData.facultyCode})`;
            if (cellData.isLabSession && cellData.labName) {
              text = `${displaySubject} ${cellData.labName}\n(${cellData.facultyCode})`;
            }
            excelCell.value = text;

            const key = `${cellData.subjectId}-${cellData.facultyCode}`;
            if (!uniqueSubjects.has(key)) {
              uniqueSubjects.set(key, {
                code: numericCode || cellData.subjectShortCode,
                name: cellData.subjectName,
                faculty: `${cellData.facultyName} (${cellData.facultyCode})`
              });
            }
          }
        });
      }
      rowNum++;
    }

    // Merge continuous labs
    const slotGroups = [
      ['lecture1', 'lecture2'],
      ['lecture3', 'lecture4', 'lecture5']
    ];

    const getRowForSlot = (slotId: string) => {
      switch(slotId) {
        case 'lecture1': return 4;
        case 'lecture2': return 5;
        case 'lecture3': return 7;
        case 'lecture4': return 8;
        case 'lecture5': return 9;
        default: return 0;
      }
    };

    if (classGrid) {
      days.forEach((day, dIdx) => {
        const col = dIdx + 2;
        slotGroups.forEach(group => {
          let labStartSlot: string | null = null;
          let labSubject: string | null = null;
          let labEndSlot: string | null = null;

          for (let i = 0; i < group.length; i++) {
            const slotId = group[i];
            const cellData = classGrid[day]?.[slotId];
            
            if (cellData?.isLabSession) {
              if (!labStartSlot) {
                labStartSlot = slotId;
                labEndSlot = slotId;
                labSubject = cellData.subjectShortCode;
              } else if (cellData.subjectShortCode === labSubject) {
                labEndSlot = slotId;
              } else {
                if (labStartSlot !== labEndSlot) {
                  ws.mergeCells(getRowForSlot(labStartSlot), col, getRowForSlot(labEndSlot!), col);
                }
                labStartSlot = slotId;
                labEndSlot = slotId;
                labSubject = cellData.subjectShortCode;
              }
            } else {
              if (labStartSlot && labStartSlot !== labEndSlot) {
                ws.mergeCells(getRowForSlot(labStartSlot), col, getRowForSlot(labEndSlot!), col);
              }
              labStartSlot = null;
              labEndSlot = null;
              labSubject = null;
            }
          }
          if (labStartSlot && labStartSlot !== labEndSlot) {
            ws.mergeCells(getRowForSlot(labStartSlot), col, getRowForSlot(labEndSlot!), col);
          }
        });
      });
    }

    // Bottom Table
    rowNum += 2; // Add some spacing
    
    // Bottom table headers
    const bHeaderRow = ws.getRow(rowNum);
    bHeaderRow.getCell(1).value = 'Subject Code';
    bHeaderRow.getCell(2).value = 'Subject Name';
    ws.mergeCells(rowNum, 2, rowNum, 3);
    bHeaderRow.getCell(4).value = 'Faculty Name';
    ws.mergeCells(rowNum, 4, rowNum, 7);
    
    styleRowCells(bHeaderRow, 25, fontBold);
    rowNum++;

    // Bottom table data
    const sortedSubjects = Array.from(uniqueSubjects.values()).sort((a, b) => a.code.localeCompare(b.code));
    
    // If no subjects, add an empty row just for structure
    if (sortedSubjects.length === 0) {
      const row = ws.getRow(rowNum);
      ws.mergeCells(rowNum, 2, rowNum, 3);
      ws.mergeCells(rowNum, 4, rowNum, 7);
      styleRowCells(row, 25, fontBase);
    } else {
      for (const sub of sortedSubjects) {
        const row = ws.getRow(rowNum);
        row.getCell(1).value = sub.code;
        row.getCell(2).value = sub.name;
        ws.mergeCells(rowNum, 2, rowNum, 3);
        row.getCell(4).value = sub.faculty;
        ws.mergeCells(rowNum, 4, rowNum, 7);
        
        styleRowCells(row, 25, fontBase);
        
        // Slightly adjust alignment for readability
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
        row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
        
        rowNum++;
      }
    }
  }

  // Generate and Download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `Timetables_${masterData.metadata.courseName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(blob, filename);
}

export async function exportFacultyScheduleToExcel(
  store: ManualTimetableStore,
  masterData: MasterData
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'IMS Timetable Builder';
  wb.created = new Date();

  const timeSlots = [
    { id: 'lecture1', time: '07:55 AM TO 08:50 AM' },
    { id: 'lecture2', time: '08:50 AM TO 09:40 AM' },
    { id: 'break', time: '10 Minutes Break (09:40 TO 09:50)' },
    { id: 'lecture3', time: '09:50 AM TO 10:40 AM' },
    { id: 'lecture4', time: '10:40 AM TO 11:30 AM' },
    { id: 'lecture5', time: '11:30 AM TO 12:20 PM' }
  ];

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const subjectCodeMap = new Map<number, string>();
  masterData.subjects.forEach(s => subjectCodeMap.set(s.id, s.code));

  // Precompute faculty grids
  const facultyGrids = new Map<number, Record<string, Record<string, any>>>();
  masterData.faculties.forEach(f => {
    const grid: Record<string, Record<string, any>> = {};
    days.forEach(d => {
      grid[d] = {};
      timeSlots.forEach(s => {
        if (s.id !== 'break') grid[d][s.id] = null;
      });
    });
    facultyGrids.set(f.id, grid);
  });

  for (const ct of Object.values(store.timetables)) {
    for (const d of days) {
      for (const s of timeSlots) {
        if (s.id === 'break') continue;
        const cell = ct.grid[d]?.[s.id];
        if (cell) {
          const fGrid = facultyGrids.get(cell.facultyId);
          if (fGrid && !fGrid[d][s.id]) {
            fGrid[d][s.id] = {
              className: ct.className,
              subjectId: cell.subjectId,
              subjectCode: cell.subjectShortCode,
              subjectName: cell.subjectName,
              isLab: cell.isLabSession,
              labName: cell.labName
            };
          }
        }
      }
    }
  }

  for (const f of masterData.faculties) {
    const sheetName = f.code.replace(/[*?:\\/[\]]/g, '').substring(0, 31) || f.name.substring(0, 31);
    const ws = wb.addWorksheet(sheetName);

    ws.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      paperSize: 9,
      margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }
    };

    ws.columns = [
      { width: 22 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
    ];

    const borderAll: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };

    const fontBase = { name: 'Times New Roman', size: 11 };
    const fontBold = { ...fontBase, bold: true };
    const alignCenter: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'center', wrapText: true };

    const styleRowCells = (row: ExcelJS.Row, height: number, font: any) => {
      row.height = height;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber <= 7) {
          cell.font = font;
          cell.alignment = alignCenter;
          cell.border = borderAll;
        }
      });
    };

    // Header
    const row1 = ws.getRow(1);
    row1.getCell(1).value = 'Faculty Schedule';
    ws.mergeCells(1, 1, 1, 7);
    styleRowCells(row1, 30, { ...fontBold, size: 14 });

    const row2 = ws.getRow(2);
    row2.getCell(1).value = `${f.name} (${f.code})`;
    ws.mergeCells(2, 1, 2, 7);
    styleRowCells(row2, 25, { ...fontBold, size: 12 });

    const row3 = ws.getRow(3);
    row3.values = ['Time', ...dayLabels];
    styleRowCells(row3, 25, { ...fontBold, size: 11 });

    const fGrid = facultyGrids.get(f.id)!;
    let rowNum = 4;
    const uniqueSubjects = new Map<number, any>();

    for (const slot of timeSlots) {
      const row = ws.getRow(rowNum);
      row.height = slot.id === 'break' ? 25 : 65; // Slightly taller for class + sub + lab
      
      row.getCell(1).value = slot.time;
      row.getCell(1).font = { ...fontBase, size: 10 };
      row.getCell(1).alignment = alignCenter;
      row.getCell(1).border = borderAll;

      if (slot.id === 'break') {
        row.getCell(1).value = slot.time;
        ws.mergeCells(rowNum, 1, rowNum, 7);
        styleRowCells(row, 25, { ...fontBold, size: 11 });
      } else {
        days.forEach((day, dIdx) => {
          const col = dIdx + 2; 
          const cellData = fGrid[day][slot.id];
          const excelCell = row.getCell(col);
          
          excelCell.alignment = alignCenter;
          excelCell.border = borderAll;
          excelCell.font = { ...fontBase, size: 10 };

          if (cellData) {
            const numericCode = subjectCodeMap.get(cellData.subjectId) || "";
            const displaySubject = numericCode ? `${numericCode}-${cellData.subjectCode}` : cellData.subjectCode;
            
            let text = `${cellData.className}\n${displaySubject}`;
            if (cellData.isLab && cellData.labName) {
              text += `\n🔬 ${cellData.labName}`;
            }
            excelCell.value = text;

            if (!uniqueSubjects.has(cellData.subjectId)) {
              uniqueSubjects.set(cellData.subjectId, {
                code: numericCode || cellData.subjectCode,
                name: cellData.subjectName
              });
            }
          }
        });
      }
      rowNum++;
    }

    // Merge continuous labs
    const slotGroups = [
      ['lecture1', 'lecture2'],
      ['lecture3', 'lecture4', 'lecture5']
    ];
    const getRowForSlot = (slotId: string) => {
      switch(slotId) {
        case 'lecture1': return 4;
        case 'lecture2': return 5;
        case 'lecture3': return 7;
        case 'lecture4': return 8;
        case 'lecture5': return 9;
        default: return 0;
      }
    };

    days.forEach((day, dIdx) => {
      const col = dIdx + 2;
      slotGroups.forEach(group => {
        let labStartSlot: string | null = null;
        let labSubject: string | null = null;
        let labClass: string | null = null;
        let labEndSlot: string | null = null;

        for (let i = 0; i < group.length; i++) {
          const slotId = group[i];
          const cellData = fGrid[day][slotId];
          
          if (cellData?.isLab) {
            if (!labStartSlot) {
              labStartSlot = slotId;
              labEndSlot = slotId;
              labSubject = cellData.subjectCode;
              labClass = cellData.className;
            } else if (cellData.subjectCode === labSubject && cellData.className === labClass) {
              labEndSlot = slotId;
            } else {
              if (labStartSlot !== labEndSlot) {
                ws.mergeCells(getRowForSlot(labStartSlot), col, getRowForSlot(labEndSlot!), col);
              }
              labStartSlot = slotId;
              labEndSlot = slotId;
              labSubject = cellData.subjectCode;
              labClass = cellData.className;
            }
          } else {
            if (labStartSlot && labStartSlot !== labEndSlot) {
              ws.mergeCells(getRowForSlot(labStartSlot), col, getRowForSlot(labEndSlot!), col);
            }
            labStartSlot = null;
            labEndSlot = null;
            labSubject = null;
            labClass = null;
          }
        }
        if (labStartSlot && labStartSlot !== labEndSlot) {
          ws.mergeCells(getRowForSlot(labStartSlot), col, getRowForSlot(labEndSlot!), col);
        }
      });
    });

    rowNum += 2;
    
    const bHeaderRow = ws.getRow(rowNum);
    bHeaderRow.getCell(1).value = 'Subject Code';
    ws.mergeCells(rowNum, 1, rowNum, 2);
    bHeaderRow.getCell(3).value = 'Subject Full Name';
    ws.mergeCells(rowNum, 3, rowNum, 7);
    
    styleRowCells(bHeaderRow, 25, fontBold);
    rowNum++;

    const sortedSubjects = Array.from(uniqueSubjects.values()).sort((a, b) => a.code.localeCompare(b.code));
    
    if (sortedSubjects.length === 0) {
      const row = ws.getRow(rowNum);
      ws.mergeCells(rowNum, 1, rowNum, 2);
      ws.mergeCells(rowNum, 3, rowNum, 7);
      styleRowCells(row, 25, fontBase);
    } else {
      for (const sub of sortedSubjects) {
        const row = ws.getRow(rowNum);
        row.getCell(1).value = sub.code;
        ws.mergeCells(rowNum, 1, rowNum, 2);
        row.getCell(3).value = sub.name;
        ws.mergeCells(rowNum, 3, rowNum, 7);
        
        styleRowCells(row, 25, fontBase);
        row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
        
        rowNum++;
      }
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `Faculty_Schedules_${masterData.metadata.courseName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(blob, filename);
}
