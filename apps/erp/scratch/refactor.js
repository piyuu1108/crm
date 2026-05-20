const fs = require('fs');
const path = require('path');

const files = [
  "app/api/requests/[id]/route.ts",
  "app/api/requests/route.ts",
  "app/api/requests/faculty-search/route.ts",
  "app/api/requests/faculty/route.ts",
  "app/api/internal-exams/[id]/route.ts",
  "app/api/internal-exams/student-marks/route.ts",
  "app/api/internal-exams/route.ts",
  "app/api/internal-evaluation/export/route.ts",
  "app/api/faculty/circulars/[slug]/route.ts",
  "app/api/faculty/circulars/route.ts",
  "app/api/counselor/students/[studentId]/route.ts",
  "app/api/counselor/students/next-id/route.ts",
  "app/api/counselor/email-jobs/[jobId]/route.ts",
  "app/api/counselor/divisions/[id]/students/send-password-email/route.ts",
  "app/api/counselor/divisions/[id]/students/send-password-email/bulk/route.ts",
  "app/api/counselor/divisions/[id]/students/route.ts",
  "app/api/counselor/divisions/[id]/route.ts",
  "app/api/counselor/divisions/route.ts",
  "app/api/circulars/[slug]/route.ts",
  "app/api/circulars/route.ts",
  "app/api/attendance/students/route.ts",
  "app/api/attendance/sessions/route.ts",
  "app/api/admin/promotion/route.ts",
  "app/api/admin/timetable/divisions/route.ts",
  "app/api/admin/timetable/publish/route.ts",
  "app/api/admin/subject-assignments/route.ts",
  "app/api/admin/subjects/route.ts",
  "app/api/admin/subjects/[id]/route.ts",
  "app/api/attendance/my/route.ts",
  "app/api/admin/students/[studentId]/route.ts",
  "app/api/admin/faculty/[id]/route.ts",
  "app/api/admin/faculty/send-password-email/route.ts",
  "app/api/admin/faculty/route.ts",
  "app/api/admin/faculty/send-password-email/bulk/route.ts",
  "app/api/admin/students/next-id/route.ts",
  "app/api/admin/enrollment-history/route.ts",
  "app/api/admin/email-jobs/[jobId]/route.ts",
  "app/api/admin/divisions/route.ts",
  "app/api/admin/divisions/[id]/route.ts",
  "app/api/admin/divisions/[id]/students/send-password-email/route.ts",
  "app/api/admin/divisions/[id]/students/send-password-email/bulk/route.ts"
];

const basePath = "p:\\02_projects\\mono\\apps\\erp";

function findEndOfVerifyTokenBlock(content, startIdx) {
  // Find where "verifyToken(" is
  const verifyTokenIdx = content.indexOf("verifyToken(", startIdx);
  if (verifyTokenIdx === -1) return -1;
  
  // Find the next "if (!payload)" or "if(!payload)" or "if (!token)" etc.
  // We want to find the "if" after verifyToken
  const ifIdx = content.indexOf("if", verifyTokenIdx);
  if (ifIdx === -1) return -1;
  
  // Find the closing parenthesis of the if condition
  const openBracketIdx = content.indexOf("(", ifIdx);
  if (openBracketIdx === -1) return -1;
  let bracketCount = 1;
  let closeBracketIdx = -1;
  for (let i = openBracketIdx + 1; i < content.length; i++) {
    if (content[i] === '(') bracketCount++;
    else if (content[i] === ')') {
      bracketCount--;
      if (bracketCount === 0) {
        closeBracketIdx = i;
        break;
      }
    }
  }
  
  if (closeBracketIdx === -1) return -1;
  
  // Find start of the statement block
  let searchIdx = closeBracketIdx + 1;
  while (searchIdx < content.length && /\s/.test(content[searchIdx])) {
    searchIdx++;
  }
  
  if (content[searchIdx] === '{') {
    // Braced block: find matching closing brace
    let braceCount = 1;
    for (let i = searchIdx + 1; i < content.length; i++) {
      if (content[i] === '{') braceCount++;
      else if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          return i + 1;
        }
      }
    }
  } else {
    // Single-line statement: find next semicolon
    const semiIdx = content.indexOf(';', searchIdx);
    if (semiIdx !== -1) {
      return semiIdx + 1;
    }
  }
  return -1;
}

function run() {
  for (const relPath of files) {
    const fullPath = path.join(basePath, relPath.replace(/\//g, path.sep));
    if (!fs.existsSync(fullPath)) {
      console.warn(`File not found: ${fullPath}`);
      continue;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let original = content;

    // 1. Rename _req to req for method signatures
    content = content.replace(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(\s*_req\s*:\s*(NextRequest|Request)/g, 
      'export async function $1(req: $2');

    // 2. Add req parameter if signature has no parameters
    // e.g. export async function GET() {
    content = content.replace(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(\s*\)\s*\{/g, 
      'export async function $1(req: NextRequest) {');

    // 3. Replacements for helper definitions (so they accept `req`)
    content = content.replace(/async\s+function\s+(authorizeStaff|authorizeHod|authorize|authenticate|getCallerPayload)\s*\(\)\s*\{/g, 
      'async function $1(req: NextRequest) {');

    // 4. Update helper calls to pass `req`
    content = content.replace(/await\s+authorizeStaff\(\)/g, 'await authorizeStaff(req)');
    content = content.replace(/await\s+authorizeHod\(\)/g, 'await authorizeHod(req)');
    content = content.replace(/await\s+authorize\(\)/g, 'await authorize(req)');
    content = content.replace(/await\s+authenticate\(\)/g, 'await authenticate(req)');
    content = content.replace(/await\s+getCallerPayload\(\)/g, 'await getCallerPayload(req)');

    // 5. Replace cookies/verifyToken block using brace parser
    let startIdx = 0;
    while (true) {
      const matchIdx = content.indexOf("await cookies()", startIdx);
      if (matchIdx === -1) break;

      // Find the start of the block: usually "const cookieStore = await cookies();" or similar
      let blockStartIdx = matchIdx;
      while (blockStartIdx > 0 && content[blockStartIdx - 1] !== '\n' && content[blockStartIdx - 1] !== ';') {
        blockStartIdx--;
      }
      // Trim leading space/indentation to find the absolute line start
      while (blockStartIdx > 0 && (content[blockStartIdx - 1] === ' ' || content[blockStartIdx - 1] === '\t')) {
        blockStartIdx--;
      }

      const blockEndIdx = findEndOfVerifyTokenBlock(content, matchIdx);
      if (blockEndIdx === -1) {
        // Move forward to avoid infinite loop
        startIdx = matchIdx + 15;
        continue;
      }

      const blockText = content.substring(blockStartIdx, blockEndIdx);
      let replacement = '';

      if (blockText.includes("error: NextResponse.json")) {
        replacement = `const payload = await getAuthContext(req);\n  if (!payload) return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };`;
      } else if (blockText.includes("NextResponse.json")) {
        replacement = `const payload = await getAuthContext(req);\n    if (!payload) {\n      return NextResponse.json(\n        { success: false, error: "Unauthorized" },\n        { status: 401 }\n      );\n    }`;
      } else if (blockText.includes("error: err(")) {
        replacement = `const payload = await getAuthContext(req);\n  if (!payload) return { error: err("Unauthorized", 401) };`;
      } else if (blockText.includes("return null;")) {
        replacement = `const payload = await getAuthContext(req);\n  if (!payload) return null;`;
      } else {
        replacement = `const payload = await getAuthContext(req);\n    if (!payload) return err("Unauthorized", 401);`;
      }

      content = content.substring(0, blockStartIdx) + replacement + content.substring(blockEndIdx);
      
      // Update startIdx to point after the inserted replacement
      startIdx = blockStartIdx + replacement.length;
    }

    // 6. Replace verifyToken imports
    content = content.replace(/import\s*\{\s*verifyToken\s*\}\s*from\s*["']@\/app\/lib\/auth["'];?/g, 
      'import { getAuthContext } from "@/app/lib/api-auth";');
    content = content.replace(/import\s*\{\s*verifyToken\s*\}\s*from\s*["']\.\.\/\.\.\/\.\.\/lib\/auth["'];?/g, 
      'import { getAuthContext } from "@/app/lib/api-auth";');
    content = content.replace(/import\s*\{\s*verifyToken\s*\}\s*from\s*["']\.\.\/\.\.\/lib\/auth["'];?/g, 
      'import { getAuthContext } from "@/app/lib/api-auth";');
    content = content.replace(/import\s*\{\s*verifyToken\s*\}\s*from\s*["']\.\.\/lib\/auth["'];?/g, 
      'import { getAuthContext } from "@/app/lib/api-auth";');

    // 7. Remove unused `cookies` import from next/headers if no cookies() calls remain
    const hasCookiesRef = (content.replace(/import\s*\{[^}]*cookies[^}]*\}\s*from\s*["']next\/headers["'];?/g, '').match(/\bcookies\b/) !== null);
    if (!hasCookiesRef) {
      content = content.replace(/import\s*\{\s*cookies\s*\}\s*from\s*["']next\/headers["'];?/g, '');
      content = content.replace(/import\s*\{\s*cookies\s*,\s*([^}]+)\}\s*from\s*["']next\/headers["'];?/g, 'import { $1 } from "next/headers";');
      content = content.replace(/import\s*\{\s*([^,]+),\s*cookies\s*\}\s*from\s*["']next\/headers["'];?/g, 'import { $1 } from "next/headers";');
    }

    if (content !== original) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`Successfully refactored: ${relPath}`);
    } else {
      console.log(`No changes made to: ${relPath}`);
    }
  }
}

run();
