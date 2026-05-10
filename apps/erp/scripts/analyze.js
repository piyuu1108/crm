const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const apiDir = path.join(root, "app", "api");
const pagesDir = path.join(root, "app", "app");
const componentsDir = path.join(root, "components");
const libDir = path.join(root, "app", "lib");

function walkSync(dir, filelist = []) {
  if (!fs.existsSync(dir)) return filelist;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      filelist = walkSync(filepath, filelist);
    } else {
      filelist.push(filepath);
    }
  }
  return filelist;
}

const apiFiles = walkSync(apiDir).filter(f => f.endsWith("route.ts"));
const pageFiles = walkSync(pagesDir).filter(f => f.endsWith("page.tsx"));
const queryFiles = walkSync(path.join(libDir, "queries")).filter(f => f.endsWith(".ts"));
const componentFiles = [
  ...walkSync(pagesDir).filter(f => !f.endsWith("page.tsx") && !f.endsWith("layout.tsx") && f.endsWith(".tsx")),
  ...walkSync(componentsDir).filter(f => f.endsWith(".tsx"))
];
const allFiles = [...apiFiles, ...pageFiles, ...queryFiles, ...componentFiles];

let dbQueryCount = 0;
let nPlusOneCandidates = [];
let missingMemo = [];
let largeComponents = [];
let duplicateAPICalls = [];
let overfetchingAPIs = [];

const analysis = {
  totalRoutes: pageFiles.length,
  totalApis: apiFiles.length,
  componentsAnalyzed: componentFiles.length,
  largeFiles: [],
  dbQueries: [],
  apiUsage: {},
  hookIssues: []
};

for (const file of allFiles) {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");
  const relativePath = path.relative(root, file);

  // Large files
  if (lines.length > 300) {
    analysis.largeFiles.push({ file: relativePath, lines: lines.length });
  }

  // Frontend specific
  if (file.endsWith(".tsx")) {
    const useStates = (content.match(/useState\(/g) || []).length;
    const useEffects = (content.match(/useEffect\(/g) || []).length;
    const useQueries = (content.match(/useQuery\(/g) || []).length;
    
    if (useEffects > 2) {
      analysis.hookIssues.push({ file: relativePath, issue: "Multiple useEffects (>2) - possible re-render risk" });
    }
    if (lines.length > 150 && !content.includes("React.memo") && (content.includes("=>") || content.includes("function"))) {
      missingMemo.push(relativePath);
    }
    
    // API calling map
    const useQueryMatches = content.match(/use[a-zA-Z0-9]+Query\(/g);
    if (useQueryMatches) {
       for (const m of useQueryMatches) {
         analysis.apiUsage[m] = (analysis.apiUsage[m] || 0) + 1;
       }
    }
  }

  // Backend / DB specific
  if (file.includes("queries") || file.includes("api")) {
    const dbSelects = (content.match(/db\.select/g) || []).length;
    const dbQueries = (content.match(/db\.query\./g) || []).length;
    
    dbQueryCount += (dbSelects + dbQueries);
    
    if (dbSelects > 0 || dbQueries > 0) {
      analysis.dbQueries.push({ file: relativePath, selects: dbSelects, queries: dbQueries });
    }
    
    // Basic N+1 check (db call inside map/for)
    if (/(\.map\(|for\s*\(|for\s*await).*(db\.select|db\.query)/s.test(content) || /Promise\.all\(.*\.map\(.*db\./s.test(content)) {
      nPlusOneCandidates.push(relativePath);
    }
    
    // Select *
    if (/db\.select\(\)\.from/.test(content)) {
       overfetchingAPIs.push(relativePath);
    }
  }
}

const summary = {
  totalRoutes: analysis.totalRoutes,
  totalApis: analysis.totalApis,
  totalComponentsAnalyzed: analysis.componentsAnalyzed,
  dbQueryCount,
  nPlusOneCandidates,
  overfetchingCandidates: overfetchingAPIs,
  largeFiles: analysis.largeFiles.sort((a,b) => b.lines - a.lines).slice(0, 10),
  topHookIssues: analysis.hookIssues.slice(0, 10),
  missingMemo: missingMemo.slice(0, 10),
  dbQueriesBreakdown: analysis.dbQueries.sort((a,b) => (b.selects + b.queries) - (a.selects + a.queries)).slice(0, 10),
  apiUsage: analysis.apiUsage
};

fs.writeFileSync(path.join(root, "scripts", "analysis_result.json"), JSON.stringify(summary, null, 2));
console.log("Analysis complete.");
