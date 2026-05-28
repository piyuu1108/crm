const fs = require("fs");
const path = require("path");
const apiDir = "p:/02_projects/mono/apps/erp/app/api";
function scanDirectory(dir, results = []) {
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      scanDirectory(filePath, results);
    } else if (file === "route.ts") {
      results.push(filePath);
    }
  });
  return results;
}
const routeFiles = scanDirectory(apiDir);
const report = [];
routeFiles.forEach((file) => {
  const content = fs.readFileSync(file, "utf8");
  const relPath = path.relative(apiDir, file);
  
  const hasGET = content.includes("export async function GET");
  const hasPOST = content.includes("export async function POST");
  const hasPUT = content.includes("export async function PUT");
  const hasPATCH = content.includes("export async function PATCH");
  const hasDELETE = content.includes("export async function DELETE");
  
  const hasAuditLogger = content.includes("AuditLogger") || content.includes("logEvent");
  
  const methods = [];
  if (hasGET) methods.push("GET");
  if (hasPOST) methods.push("POST");
  if (hasPUT) methods.push("PUT");
  if (hasPATCH) methods.push("PATCH");
  if (hasDELETE) methods.push("DELETE");
  
  const mutates = hasPOST || hasPUT || hasPATCH || hasDELETE;
  
  if (mutates && !hasAuditLogger) {
    report.push({
      file: relPath.replace(/\\/g, "/"),
      methods: methods.join(", ")
    });
  }
});
console.log(JSON.stringify(report, null, 2));