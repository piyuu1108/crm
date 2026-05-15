use super::foreground::ForegroundApp;
use std::collections::HashMap;
use std::sync::LazyLock;

/// Browsers whose window titles should be parsed to extract the active site/tab.
static BROWSER_PROCESSES: LazyLock<Vec<&'static str>> = LazyLock::new(|| {
    vec![
        "chrome.exe",
        "msedge.exe",
        "firefox.exe",
        "brave.exe",
        "opera.exe",
        "vivaldi.exe",
        "iexplore.exe",
        "chromium.exe",
    ]
});

/// Static mapping of process names to friendly display names.
/// Keys must be lowercase.
static APP_NAMES: LazyLock<HashMap<&'static str, &'static str>> = LazyLock::new(|| {
    let mut m = HashMap::new();
    // Microsoft Office
    m.insert("winword.exe", "Word");
    m.insert("excel.exe", "Excel");
    m.insert("powerpnt.exe", "PowerPoint");
    m.insert("onenote.exe", "OneNote");
    m.insert("outlook.exe", "Outlook");
    m.insert("msaccess.exe", "Access");
    m.insert("mspub.exe", "Publisher");
    m.insert("teams.exe", "Teams");
    m.insert("ms-teams.exe", "Teams");

    // Development
    m.insert("code.exe", "VS Code");
    m.insert("devenv.exe", "Visual Studio");
    m.insert("idea64.exe", "IntelliJ IDEA");
    m.insert("pycharm64.exe", "PyCharm");
    m.insert("webstorm64.exe", "WebStorm");
    m.insert("clion64.exe", "CLion");
    m.insert("rider64.exe", "Rider");
    m.insert("studio64.exe", "Android Studio");
    m.insert("sublime_text.exe", "Sublime Text");
    m.insert("notepad++.exe", "Notepad++");
    m.insert("atom.exe", "Atom");
    m.insert("windowsterminal.exe", "Windows Terminal");
    m.insert("cmd.exe", "Command Prompt");
    m.insert("powershell.exe", "PowerShell");
    m.insert("pwsh.exe", "PowerShell");
    m.insert("mintty.exe", "Git Bash");
    m.insert("wt.exe", "Windows Terminal");
    m.insert("alacritty.exe", "Alacritty");
    m.insert("postman.exe", "Postman");

    // Databases
    m.insert("pgadmin4.exe", "pgAdmin");
    m.insert("ssms.exe", "SQL Server Management Studio");
    m.insert("dbeaver.exe", "DBeaver");
    m.insert("mongosh.exe", "MongoDB Shell");

    // Design
    m.insert("figma.exe", "Figma");
    m.insert("xd.exe", "Adobe XD");
    m.insert("photoshop.exe", "Photoshop");
    m.insert("illustrator.exe", "Illustrator");
    m.insert("afterfx.exe", "After Effects");
    m.insert("premiere pro.exe", "Premiere Pro");
    m.insert("blender.exe", "Blender");

    // Utilities
    m.insert("explorer.exe", "File Explorer");
    m.insert("notepad.exe", "Notepad");
    m.insert("mspaint.exe", "Paint");
    m.insert("calc.exe", "Calculator");
    m.insert("calculatorapp.exe", "Calculator");
    m.insert("snippingtool.exe", "Snipping Tool");
    m.insert("taskmgr.exe", "Task Manager");

    // Communication
    m.insert("slack.exe", "Slack");
    m.insert("discord.exe", "Discord");
    m.insert("zoom.exe", "Zoom");
    m.insert("whatsapp.exe", "WhatsApp");
    m.insert("telegram.exe", "Telegram");

    // Media
    m.insert("vlc.exe", "VLC Media Player");
    m.insert("spotify.exe", "Spotify");
    m.insert("wmplayer.exe", "Windows Media Player");

    // Productivity
    m.insert("acrobat.exe", "Adobe Acrobat");
    m.insert("acrord32.exe", "Adobe Reader");
    m.insert("sumatrapdf.exe", "SumatraPDF");
    m.insert("7zfm.exe", "7-Zip");
    m.insert("winrar.exe", "WinRAR");

    // Analytics / BI
    m.insert("pbiddesktop.exe", "Power BI");
    m.insert("tableau.exe", "Tableau");

    // Virtualization
    m.insert("vmware.exe", "VMware");
    m.insert("virtualbox.exe", "VirtualBox");
    m.insert("virtualboxvm.exe", "VirtualBox");

    m
});

/// Normalize a foreground application into a clean, human-friendly name.
///
/// For browsers: extracts the page/site title from the window title.
/// For known apps: maps to a friendly name.
/// Fallback: strips `.exe` and title-cases the process name.
pub fn normalize(app: &ForegroundApp) -> String {
    let process_lower = app.process_name.to_lowercase();

    // 1. Browser title parsing
    if BROWSER_PROCESSES.iter().any(|b| *b == process_lower) {
        return normalize_browser_title(&app.window_title, &process_lower);
    }

    // 2. Known application lookup
    if let Some(friendly) = APP_NAMES.get(process_lower.as_str()) {
        return friendly.to_string();
    }

    // 3. Fallback: strip .exe, title-case
    strip_and_titlecase(&app.process_name)
}

/// Parse browser window title to extract the meaningful page/site name.
///
/// Browser titles typically follow: "Page Title - BrowserName"
/// We extract everything before the last " - " separator (the browser name suffix).
fn normalize_browser_title(title: &str, _process: &str) -> String {
    if title.is_empty() {
        return "Browser".to_string();
    }

    // Find the last " - " which separates page title from browser name
    // e.g. "YouTube - Google Chrome" → "YouTube"
    // e.g. "React docs - Getting Started - Google Chrome" → "React docs - Getting Started"
    if let Some(pos) = title.rfind(" - ") {
        let page_title = title[..pos].trim();
        if page_title.is_empty() {
            return "Browser".to_string();
        }

        // For very long titles, truncate to keep analytics clean
        if page_title.len() > 60 {
            return format!("{}…", &page_title[..57]);
        }

        return page_title.to_string();
    }

    // Edge case: title has " — " (em-dash) separator (some browsers/sites use this)
    if let Some(pos) = title.rfind(" — ") {
        let page_title = title[..pos].trim();
        if !page_title.is_empty() {
            if page_title.len() > 60 {
                return format!("{}…", &page_title[..57]);
            }
            return page_title.to_string();
        }
    }

    // No separator found — just use the full title (truncated)
    if title.len() > 60 {
        format!("{}…", &title[..57])
    } else {
        title.to_string()
    }
}

/// Strip .exe extension and convert to title case.
/// e.g. "someapp.exe" → "Someapp", "MyTool" → "MyTool"
fn strip_and_titlecase(name: &str) -> String {
    let stripped = name
        .strip_suffix(".exe")
        .or_else(|| name.strip_suffix(".EXE"))
        .unwrap_or(name);

    if stripped.is_empty() {
        return "Unknown".to_string();
    }

    // Title-case: uppercase first letter
    let mut chars = stripped.chars();
    match chars.next() {
        None => "Unknown".to_string(),
        Some(first) => {
            let mut result = first.to_uppercase().to_string();
            result.extend(chars);
            result
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_app(process: &str, title: &str) -> ForegroundApp {
        ForegroundApp {
            process_name: process.to_string(),
            window_title: title.to_string(),
            pid: 0,
        }
    }

    #[test]
    fn test_browser_youtube() {
        let app = make_app("chrome.exe", "YouTube - Google Chrome");
        assert_eq!(normalize(&app), "YouTube");
    }

    #[test]
    fn test_browser_chatgpt() {
        let app = make_app("msedge.exe", "ChatGPT - Microsoft Edge");
        assert_eq!(normalize(&app), "ChatGPT");
    }

    #[test]
    fn test_browser_complex_title() {
        let app = make_app("chrome.exe", "React docs - Getting Started - Google Chrome");
        assert_eq!(normalize(&app), "React docs - Getting Started");
    }

    #[test]
    fn test_known_app_vscode() {
        let app = make_app("Code.exe", "main.rs - labsense-agent");
        assert_eq!(normalize(&app), "VS Code");
    }

    #[test]
    fn test_known_app_powerpoint() {
        let app = make_app("POWERPNT.EXE", "Presentation1 - PowerPoint");
        assert_eq!(normalize(&app), "PowerPoint");
    }

    #[test]
    fn test_known_app_word() {
        let app = make_app("WINWORD.EXE", "Document1 - Word");
        assert_eq!(normalize(&app), "Word");
    }

    #[test]
    fn test_unknown_app_fallback() {
        let app = make_app("myapp.exe", "Some Window");
        assert_eq!(normalize(&app), "Myapp");
    }

    #[test]
    fn test_browser_empty_title() {
        let app = make_app("chrome.exe", "");
        assert_eq!(normalize(&app), "Browser");
    }
}
