const fs = require("fs");
const path = require("path");

// Regex to match full interface blocks (basic version)
const INTERFACE_REGEX = /interface\s+\w+[^{]*\{[\s\S]*?\}/g;

function extractInterfaces(rootDir) {
  let output = "";

  function walk(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dir, file.name);

      if (file.isDirectory()) {
        if (file.name === "node_modules") continue;
        walk(fullPath);
      } else if (file.isFile()) {
        if (file.name.endsWith(".ts") || file.name.endsWith(".tsx")) {
          try {
            const content = fs.readFileSync(fullPath, "utf-8");
            const matches = content.match(INTERFACE_REGEX);

            if (matches && matches.length > 0) {
              output += `\n===== ${fullPath} =====\n\n`;

              matches.forEach((match, index) => {
                output += `--- Interface ${index + 1} ---\n`;
                output += match + "\n\n";
              });
            }
          } catch (err) {
            console.error(`Error reading ${fullPath}:`, err.message);
          }
        }
      }
    }
  }

  walk(rootDir);
  return output;
}

// Run script
const rootDirectory = process.cwd();
const result = extractInterfaces(rootDirectory);

// Save to file
fs.writeFileSync("interfaces.txt", result, "utf-8");

console.log("✅ Interfaces saved to interfaces.txt");