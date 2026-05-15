# Application Detection & Normalization

How the LabSense agent detects, identifies, and normalizes application usage on Windows.

---

## 1. Foreground App Detection

The agent polls every **~1 second** using Win32 APIs:

```
GetForegroundWindow()  →  HWND (window handle)
         ↓
GetWindowThreadProcessId(HWND)  →  PID (process ID)
         ↓
sysinfo::process(PID)  →  process name (e.g. "chrome.exe")
         ↓
GetWindowTextW(HWND)  →  window title (e.g. "YouTube - Google Chrome")
```

### What we get each tick

| Field | Example | Source |
|---|---|---|
| `process_name` | `chrome.exe` | `sysinfo` crate (from PID) |
| `window_title` | `YouTube - Google Chrome` | `GetWindowTextW` Win32 API |
| `pid` | `14832` | `GetWindowThreadProcessId` |

If no window is focused (e.g. desktop), the app is recorded as **"Desktop"**.

---

## 2. Idle Detection

Uses `GetLastInputInfo()` Win32 API:

```
idle_seconds = (GetTickCount() - LastInputInfo.dwTime) / 1000
```

- Tracks last keyboard or mouse input timestamp
- Compares against server-configured `idleThresholdSeconds`
- If `idle_seconds >= threshold` → user is idle

Each 1-second tick increments either **active** or **idle** counters (never both).

---

## 3. Application Normalization

Raw process names like `POWERPNT.EXE` aren't useful for analytics. The normalizer converts them to clean, human-readable names.

### 3.1 Browser Title Parsing

Browsers are detected by process name:

```
chrome.exe, msedge.exe, firefox.exe, brave.exe,
opera.exe, vivaldi.exe, iexplore.exe, chromium.exe
```

For browsers, we parse the window title to extract what the student is actually using:

```
Window Title Format:  "Page Title - Browser Name"
                             ↑              ↑
                         we keep this    we strip this
```

### 3.1 Authentication Page Grouping

To prevent storing sensitive paths and to make analytics readable, related authentication pages are merged into clean categories:

| Example Window Title | Normalized Name |
|---|---|
| `accounts.google.com/signin/oauth/id...` | **Google Authentication** |
| `Sign in - Google Accounts - Microsoft Edge` | **Google Authentication** |
| `login.microsoftonline.com/common/...` | **Microsoft Authentication** |
| `Sign in to GitHub - Brave` | **GitHub Authentication** |

### 3.2 Clean URL Stripping

If the browser title is a raw URL (e.g. while a page is loading, or on pages without a `<title>`), we strip query parameters, tokens, and paths to leave only the clean domain:

| Raw Title | Normalized Name |
|---|---|
| `https://web.whatsapp.com` | **WhatsApp** |
| `chat.openai.com/c/1234` | **ChatGPT** |
| `localhost:3000/dashboard?token=abc#hash` | **localhost:3000** |
| `github.com/mohit-rajput-py/labsense` | **github.com** |

### 3.3 Known Application Mapping

70+ common applications are mapped to friendly names:

#### Microsoft Office

| Process | Normalized |
|---|---|
| `WINWORD.EXE` | **Word** |
| `EXCEL.EXE` | **Excel** |
| `POWERPNT.EXE` | **PowerPoint** |
| `ONENOTE.EXE` | **OneNote** |
| `OUTLOOK.EXE` | **Outlook** |
| `MSACCESS.EXE` | **Access** |
| `MSPUB.EXE` | **Publisher** |
| `teams.exe` | **Teams** |

#### Development Tools

| Process | Normalized |
|---|---|
| `Code.exe` | **VS Code** |
| `devenv.exe` | **Visual Studio** |
| `idea64.exe` | **IntelliJ IDEA** |
| `pycharm64.exe` | **PyCharm** |
| `webstorm64.exe` | **WebStorm** |
| `clion64.exe` | **CLion** |
| `rider64.exe` | **Rider** |
| `studio64.exe` | **Android Studio** |
| `sublime_text.exe` | **Sublime Text** |
| `notepad++.exe` | **Notepad++** |
| `postman.exe` | **Postman** |

#### Terminals

| Process | Normalized |
|---|---|
| `cmd.exe` | **Command Prompt** |
| `powershell.exe` | **PowerShell** |
| `pwsh.exe` | **PowerShell** |
| `wt.exe` | **Windows Terminal** |
| `mintty.exe` | **Git Bash** |
| `alacritty.exe` | **Alacritty** |

#### Database Tools

| Process | Normalized |
|---|---|
| `pgadmin4.exe` | **pgAdmin** |
| `ssms.exe` | **SQL Server Management Studio** |
| `dbeaver.exe` | **DBeaver** |
| `mongosh.exe` | **MongoDB Shell** |

#### Design

| Process | Normalized |
|---|---|
| `figma.exe` | **Figma** |
| `photoshop.exe` | **Photoshop** |
| `illustrator.exe` | **Illustrator** |
| `afterfx.exe` | **After Effects** |
| `blender.exe` | **Blender** |

#### Utilities

| Process | Normalized |
|---|---|
| `explorer.exe` | **File Explorer** |
| `notepad.exe` | **Notepad** |
| `mspaint.exe` | **Paint** |
| `calc.exe` | **Calculator** |
| `taskmgr.exe` | **Task Manager** |

#### Communication

| Process | Normalized |
|---|---|
| `slack.exe` | **Slack** |
| `discord.exe` | **Discord** |
| `zoom.exe` | **Zoom** |
| `whatsapp.exe` | **WhatsApp** |
| `telegram.exe` | **Telegram** |

#### Media

| Process | Normalized |
|---|---|
| `vlc.exe` | **VLC Media Player** |
| `spotify.exe` | **Spotify** |

#### Analytics / BI

| Process | Normalized |
|---|---|
| `pbiddesktop.exe` | **Power BI** |
| `tableau.exe` | **Tableau** |

### 3.3 Unknown App Fallback

Any process not in the known list:

1. Strip `.exe` suffix
2. Capitalize first letter

```
myapp.exe  →  Myapp
rustdesk.exe  →  Rustdesk
```

---

## 4. Normalization Priority

```
1. Is it a browser?  →  Parse window title
2. Is it a known app?  →  Use friendly name
3. Fallback  →  Strip .exe, capitalize
```

The lookup is **case-insensitive** — `POWERPNT.EXE`, `powerpnt.exe`, and `Powerpnt.Exe` all resolve to **PowerPoint**.

---

## 5. What Gets Sent to Server

Each sync sends **cumulative** per-app counters:

```json
{
  "totalSeconds": 600,
  "activeSeconds": 480,
  "idleSeconds": 120,
  "applications": [
    {
      "appName": "YouTube",
      "totalSeconds": 200,
      "activeSeconds": 180,
      "idleSeconds": 20
    },
    {
      "appName": "VS Code",
      "totalSeconds": 300,
      "activeSeconds": 280,
      "idleSeconds": 20
    }
  ]
}
```

The server stores these normalized names directly — clean analytics, no raw `.exe` names.
