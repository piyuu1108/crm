# LabSense Rust Agent — Walkthrough

## Summary

Built a complete Windows Rust agent for the LabSense institutional analytics system — **13 source files**, **0 build errors**, **8/8 unit tests passing**.

---

## Architecture

```
labsense-agent/
├── Cargo.toml
├── config.json                    # Dev config (serverUrl, pcName, labName)
└── src/
    ├── main.rs                    # Entry point: console + service mode
    ├── config.rs                  # Loads config.json from install path or CWD
    ├── hardware.rs                # Machine fingerprint (Windows MachineGuid)
    ├── analytics.rs               # In-memory cumulative counters (HashMap<App, Counters>)
    ├── api_client.rs              # HTTP client: login, sync, logout
    ├── session.rs                 # Session state machine (Idle ↔ Active)
    ├── sync_loop.rs               # Periodic sync with interval + jitter
    ├── monitor_loop.rs            # 1s polling: foreground app + idle detection
    ├── monitor/
    │   ├── mod.rs
    │   ├── foreground.rs          # Win32 GetForegroundWindow → process + title
    │   ├── idle.rs                # Win32 GetLastInputInfo → idle seconds
    │   └── normalizer.rs          # 70+ app mappings + browser title parsing
    ├── web_ui/
    │   ├── mod.rs                 # Warp server on 127.0.0.1:21211
    │   ├── routes.rs              # POST /api/login, POST /api/logout, GET /api/status
    │   └── static/
    │       ├── index.html         # Login + session dashboard UI
    │       ├── style.css          # Dark-mode design with Inter font
    │       └── app.js             # Client-side logic with live polling
    └── service.rs                 # Windows service (LabSenseAgent SCM)
```

---

## Key Features

| Feature | Implementation |
|---|---|
| **Auto-open browser** | Uses `open` crate on startup in console mode |
| **Browser title parsing** | Extracts page title before ` - BrowserName` (supports Chrome, Edge, Firefox, Brave, etc.) |
| **70+ app normalizations** | `POWERPNT.EXE` → `PowerPoint`, `code.exe` → `VS Code`, etc. |
| **Cumulative sync** | Idempotent — retry-safe, overwrite-safe |
| **Idle detection** | Win32 `GetLastInputInfo` with configurable threshold from server |
| **Server-authoritative config** | Sync interval, jitter, timeout, idle threshold all from login response |
| **Embedded UI** | HTML/CSS/JS compiled into the binary via `rust-embed` |
| **Dual mode** | Console (default) + Windows service (`--service` flag) |

---

## How to Run

### Console Mode (Development)

```bash
# Ensure config.json exists in project root
cargo run
```

The agent will:
1. Load `config.json`
2. Auto-open `http://127.0.0.1:21211` in the browser
3. Wait for student login

### Windows Service Mode (Production)

```powershell
# Build release
cargo build --release

# Install service
sc.exe create LabSenseAgent binPath= "C:\Program Files\LabSense\labsense-agent.exe --service"
sc.exe config LabSenseAgent start= auto
sc.exe start LabSenseAgent
```

---

## Test Results

```
running 8 tests
test monitor::normalizer::tests::test_browser_complex_title ... ok
test monitor::normalizer::tests::test_known_app_vscode ... ok
test monitor::normalizer::tests::test_known_app_word ... ok
test monitor::normalizer::tests::test_unknown_app_fallback ... ok
test monitor::normalizer::tests::test_browser_empty_title ... ok
test monitor::normalizer::tests::test_known_app_powerpoint ... ok
test monitor::normalizer::tests::test_browser_youtube ... ok
test monitor::normalizer::tests::test_browser_chatgpt ... ok

test result: ok. 8 passed; 0 failed
```

---

## Files Created

| File | Lines | Purpose |
|---|---|---|
| [Cargo.toml](file:///p:/02_projects/mono/apps/labsense-agent/Cargo.toml) | 36 | Dependencies (warp, reqwest, windows, sysinfo, etc.) |
| [main.rs](file:///p:/02_projects/mono/apps/labsense-agent/src/main.rs) | 57 | Entry point with console/service dual mode |
| [config.rs](file:///p:/02_projects/mono/apps/labsense-agent/src/config.rs) | 38 | Config loader from JSON |
| [hardware.rs](file:///p:/02_projects/mono/apps/labsense-agent/src/hardware.rs) | 17 | Machine fingerprint |
| [analytics.rs](file:///p:/02_projects/mono/apps/labsense-agent/src/analytics.rs) | 90 | In-memory counters |
| [api_client.rs](file:///p:/02_projects/mono/apps/labsense-agent/src/api_client.rs) | 171 | Server HTTP client |
| [session.rs](file:///p:/02_projects/mono/apps/labsense-agent/src/session.rs) | 73 | Session state machine |
| [sync_loop.rs](file:///p:/02_projects/mono/apps/labsense-agent/src/sync_loop.rs) | 79 | Periodic sync with jitter |
| [monitor_loop.rs](file:///p:/02_projects/mono/apps/labsense-agent/src/monitor_loop.rs) | 62 | 1s foreground app polling |
| [foreground.rs](file:///p:/02_projects/mono/apps/labsense-agent/src/monitor/foreground.rs) | 56 | Win32 foreground window API |
| [idle.rs](file:///p:/02_projects/mono/apps/labsense-agent/src/monitor/idle.rs) | 23 | Win32 idle detection |
| [normalizer.rs](file:///p:/02_projects/mono/apps/labsense-agent/src/monitor/normalizer.rs) | 261 | App normalization + browser title parsing |
| [routes.rs](file:///p:/02_projects/mono/apps/labsense-agent/src/web_ui/routes.rs) | 332 | All warp API routes |
| [service.rs](file:///p:/02_projects/mono/apps/labsense-agent/src/service.rs) | 78 | Windows service integration |
| [index.html](file:///p:/02_projects/mono/apps/labsense-agent/src/web_ui/static/index.html) | 117 | Local login/dashboard UI |
| [style.css](file:///p:/02_projects/mono/apps/labsense-agent/src/web_ui/static/style.css) | 350 | Dark-mode premium styling |
| [app.js](file:///p:/02_projects/mono/apps/labsense-agent/src/web_ui/static/app.js) | 156 | Client-side JS |
