// ==========================================
// DYNAMIC DEV STARTER
// ==========================================
// Usage Examples:
//
// node start.js next convex
// node start.js next convex cloudflare
// node start.js next minio
// node start.js all
//
// ==========================================

const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ------------------------------------------
// CONFIG
// ------------------------------------------

const APP_DIR = process.cwd();
const P_DRIVE = "P:\\";

const timestamp = new Date()
  .toISOString()
  .replace(/:/g, "-")
  .replace(/\..+/, "");

const logDir = path.join(APP_DIR, "logs");

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// ------------------------------------------
// SERVICES
// ------------------------------------------

const SERVICES = {
  next: {
    port: 3001,
    command: "pnpm",
    args: ["dev", "-p", "3001"],
    cwd: APP_DIR,
  },

  convex: {
    port: 3210,
    command: "npx",
    args: ["convex", "dev"],
    cwd: APP_DIR,
  },

  minio: {
    port: 9000,
    command: "minio.exe",
    args: ["server", "P:\\minio-data"],
    cwd: P_DRIVE,
  },

  cloudflare: {
    command: "cloudflared",
    args: ["tunnel", "--url", "http://localhost:3001"],
    cwd: P_DRIVE,
  },
};

// ------------------------------------------
// HELPERS
// ------------------------------------------

function logToFile(file, data) {
  fs.appendFileSync(file, data);
}

function prefixLog(prefix, data) {
  process.stdout.write(`[${prefix}] ${data}`);
}

function killPort(port) {
  if (!port) return;

  try {
    const output = execSync(
      `netstat -ano | findstr :${port}`,
      { encoding: "utf8" }
    );

    const lines = output.split("\n");

    const pids = new Set();

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);

      const pid = parts[parts.length - 1];

      if (pid && !isNaN(pid)) {
        pids.add(pid);
      }
    }

    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`);
        console.log(`Killed port ${port} (PID: ${pid})`);
      } catch {}
    }
  } catch {}
}

function killProcessByName(name) {
  try {
    execSync(`taskkill /IM ${name} /F`, {
      stdio: "ignore",
    });
  } catch {}
}

function startService(name, config) {
  const logFile = path.join(
    logDir,
    `${name}-${timestamp}.log`
  );

  const proc = spawn(config.command, config.args, {
    cwd: config.cwd,
    shell: true,
    windowsHide: true,
  });

  proc.stdout.on("data", (data) => {
    const text = data.toString();

    prefixLog(name.toUpperCase(), text);
    logToFile(logFile, text);
  });

  proc.stderr.on("data", (data) => {
    const text = data.toString();

    prefixLog(name.toUpperCase(), text);
    logToFile(logFile, text);
  });

  proc.on("close", (code) => {
    const msg = `\n[${name.toUpperCase()}] exited with code ${code}\n`;

    process.stdout.write(msg);
    logToFile(logFile, msg);
  });

  return proc;
}

// ------------------------------------------
// ARGUMENTS
// ------------------------------------------

let selected = process.argv.slice(2);

if (selected.includes("all")) {
  selected = Object.keys(SERVICES);
}

if (selected.length === 0) {
  console.log("");
  console.log("Usage:");
  console.log("node start.js next convex");
  console.log("node start.js next cloudflare");
  console.log("node start.js all");
  console.log("");
  process.exit(0);
}

// ------------------------------------------
// VALIDATE
// ------------------------------------------

const invalid = selected.filter(
  (name) => !SERVICES[name]
);

if (invalid.length > 0) {
  console.log("");
  console.log("Invalid services:");
  console.log(invalid.join(", "));
  console.log("");
  process.exit(1);
}

// ------------------------------------------
// CLEAN OLD PROCESSES
// ------------------------------------------

console.log("");
console.log("Cleaning old processes...");
console.log("");

for (const name of selected) {
  const service = SERVICES[name];

  if (service.port) {
    killPort(service.port);
  }
}

if (selected.includes("cloudflare")) {
  killProcessByName("cloudflared.exe");
}

// ------------------------------------------
// START
// ------------------------------------------

console.log("");
console.log("Starting services...");
console.log("");

const running = [];

for (const name of selected) {
  const service = SERVICES[name];

  const proc = startService(name, service);

  running.push({
    name,
    proc,
    port: service.port,
  });
}

// ------------------------------------------
// STATUS
// ------------------------------------------

console.log("");
console.log("Started:");
console.log(selected.join(", "));
console.log("");

console.log("Logs Folder:");
console.log(logDir);
console.log("");

console.log("Press CTRL + C to stop all");
console.log("");

// ------------------------------------------
// CLEAN EXIT
// ------------------------------------------

function cleanup() {
  console.log("");
  console.log("Stopping services...");
  console.log("");

  for (const item of running) {
    try {
      item.proc.kill("SIGINT");
    } catch {}
  }

  for (const item of running) {
    if (item.port) {
      killPort(item.port);
    }
  }

  if (selected.includes("cloudflare")) {
    killProcessByName("cloudflared.exe");
  }

  console.log("");
  console.log("All services stopped ✅");

  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);