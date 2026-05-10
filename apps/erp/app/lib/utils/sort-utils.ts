/**
 * Centralized sorting utilities for consistent ordering across the ERP UI.
 *
 * Rules (from requirements):
 * - Students: sort by numeric suffix of ID ascending (e.g. 24BCADS001 → 001)
 * - Divisions/Classes: sort by batch year → course → division number
 * - Faculty: sort alphabetically by name (A → Z)
 *
 * All utilities use stable sorting to avoid UI flicker.
 */

// ─── Student ID Sorting ───────────────────────────────────────────────────────
// Extracts the trailing numeric portion from a student ID string.
// e.g. "24BCADS001" → 1, "24BCADS100" → 100
function extractStudentNumber(studentId: string): number {
  const match = studentId.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Sort items by the numeric suffix of their student ID, ascending.
 * Stable sort — items with equal IDs maintain their original order.
 */
export function sortByStudentId<T>(
  items: T[],
  getStudentId: (item: T) => string
): T[] {
  return [...items].sort((a, b) => {
    const numA = extractStudentNumber(getStudentId(a));
    const numB = extractStudentNumber(getStudentId(b));
    return numA - numB;
  });
}

// ─── Division / Class Sorting ─────────────────────────────────────────────────
// Parses a division display name like "24BCADSDiv1" into sortable components.
// Supports formats: "24BCADiv1", "24BCADSDiv2", "25BCA-AI-Div1", etc.
interface DivisionParts {
  batchYear: number;
  coursePart: string;
  divisionNumber: number;
}

function parseDivisionName(displayName: string): DivisionParts {
  // Try to extract leading 2-digit year
  const yearMatch = displayName.match(/^(\d{2})/);
  const batchYear = yearMatch ? parseInt(yearMatch[1], 10) : 0;

  // Extract trailing division number (e.g., "Div1" → 1, "Div12" → 12)
  const divMatch = displayName.match(/Div(\d+)$/i);
  const divisionNumber = divMatch ? parseInt(divMatch[1], 10) : 0;

  // Everything between is the course identifier
  const startIdx = yearMatch ? yearMatch[0].length : 0;
  const endIdx = divMatch ? displayName.length - divMatch[0].length : displayName.length;
  const coursePart = displayName.slice(startIdx, endIdx);

  return { batchYear, coursePart, divisionNumber };
}

/**
 * Sort items in logical academic order:
 *   1. Batch year (ascending)
 *   2. Course name (alphabetical)
 *   3. Division number (ascending)
 */
export function sortDivisions<T>(
  items: T[],
  getDisplayName: (item: T) => string
): T[] {
  return [...items].sort((a, b) => {
    const pa = parseDivisionName(getDisplayName(a));
    const pb = parseDivisionName(getDisplayName(b));

    // 1. Batch year
    if (pa.batchYear !== pb.batchYear) return pa.batchYear - pb.batchYear;
    // 2. Course part (alphabetical)
    const courseComp = pa.coursePart.localeCompare(pb.coursePart);
    if (courseComp !== 0) return courseComp;
    // 3. Division number
    return pa.divisionNumber - pb.divisionNumber;
  });
}

// ─── Faculty Name Sorting ─────────────────────────────────────────────────────

/**
 * Sort items alphabetically by name (A → Z).
 * Case-insensitive comparison.
 */
export function sortByName<T>(
  items: T[],
  getName: (item: T) => string
): T[] {
  return [...items].sort((a, b) =>
    getName(a).localeCompare(getName(b), undefined, { sensitivity: "base" })
  );
}
