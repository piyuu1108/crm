use crate::analytics::AppIdentity;
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

/// Normalize a foreground application into a clean, human-friendly name and context.
///
/// For browsers: uses UIA domain if available, else extracts from title.
/// For known apps: maps to a friendly name, using window title as context.
/// Fallback: strips `.exe` and title-cases the process name.
pub fn normalize(app: &ForegroundApp, domain_from_uia: Option<&str>) -> AppIdentity {
    let process_lower = app.process_name.to_lowercase();

    // 1. Browser domain/title parsing
    if BROWSER_PROCESSES.iter().any(|b| *b == process_lower) {
        if let Some(domain) = domain_from_uia {
            return normalize_by_domain(domain, &app.window_title);
        }
        return normalize_browser_title(&app.window_title, &process_lower);
    }

    let mut context_title = app.window_title.trim().to_string();
    if context_title.is_empty() {
        context_title = "Active".to_string();
    }

    // 2. Known application lookup
    if let Some(friendly) = APP_NAMES.get(process_lower.as_str()) {
        return AppIdentity {
            app_name: friendly.to_string(),
            context_title: Some(context_title),
        };
    }

    // 3. Fallback: strip .exe, title-case
    AppIdentity {
        app_name: strip_and_titlecase(&app.process_name),
        context_title: Some(context_title),
    }
}

fn normalize_domain(domain: &str) -> &str {
    match domain {
        "youtube.com" => "YouTube",
        "github.com" => "GitHub",
        "chatgpt.com" => "ChatGPT",
        "openai.com" => "ChatGPT",
        "amazon.in" => "Amazon",
        "amazon.com" => "Amazon",
        "aws.amazon.com" => "AWS",
        "stackoverflow.com" => "Stack Overflow",
        "google.com" => "Google",
        "microsoft.com" => "Microsoft",
        "notion.so" => "Notion",
        "figma.com" => "Figma",
        "linkedin.com" => "LinkedIn",
        "twitter.com" => "X (Twitter)",
        "x.com" => "X (Twitter)",
        "facebook.com" => "Facebook",
        "instagram.com" => "Instagram",
        "reddit.com" => "Reddit",
        "whatsapp.com" => "WhatsApp Web",
        "discord.com" => "Discord",
        _ => domain,
    }
}

/// Helper to normalize using an explicitly extracted URL/domain.
fn normalize_by_domain(url_str: &str, title: &str) -> AppIdentity {
    let mut page_title = title;
    if let Some(pos) = title.rfind(" - ").or_else(|| title.rfind(" — ")) {
        page_title = title[..pos].trim();
    }
    if page_title.is_empty() {
        page_title = "Active";
    }

    let parsed = match url::Url::parse(url_str) {
        Ok(p) => p,
        Err(_) => {
            return AppIdentity {
                app_name: "Browser".to_string(),
                context_title: Some(page_title.to_string()),
            };
        }
    };

    let host = match parsed.host_str() {
        Some(h) => h,
        None => {
            return AppIdentity {
                app_name: "Browser".to_string(),
                context_title: Some(page_title.to_string()),
            };
        }
    };

    let root_domain = match addr::parse_domain_name(host) {
        Ok(domain) => {
            if let Some(root) = domain.root() {
                root.to_string()
            } else {
                host.to_string()
            }
        }
        Err(_) => host.to_string(),
    };

    let friendly_name = normalize_domain(&root_domain);

    let app_name = if friendly_name == root_domain {
        // Fallback: title-case the root domain (e.g. "vtcbcsr.com" -> "Vtcbcsr")
        let parts: Vec<&str> = root_domain.split('.').collect();
        let main_part = parts[0];
        let mut chars = main_part.chars();
        match chars.next() {
            None => "Browser".to_string(),
            Some(first) => {
                let mut result = first.to_uppercase().to_string();
                result.extend(chars);
                result
            }
        }
    } else {
        friendly_name.to_string()
    };

    AppIdentity {
        app_name,
        context_title: Some(page_title.to_string()),
    }
}


/// Parse browser window title to extract the meaningful page/site name and context.
fn normalize_browser_title(title: &str, _process: &str) -> AppIdentity {
    if title.is_empty() {
        return AppIdentity {
            app_name: "Browser".to_string(),
            context_title: None,
        };
    }

    let mut page_title = title;

    // 1. Strip the browser suffix (e.g. " - Google Chrome")
    if let Some(pos) = title.rfind(" - ").or_else(|| title.rfind(" — ")) {
        let extracted = title[..pos].trim();
        if !extracted.is_empty() {
            page_title = extracted;
        }
    }

    let lower = page_title.to_lowercase();

    // 2. Auth Page Protection (Minimal static rule to prevent token leaks)
    if lower.contains("accounts.google.com")
        || lower.contains("sign in - google")
        || lower.contains("sign in – google")
    {
        return AppIdentity {
            app_name: "Google Authentication".to_string(),
            context_title: None,
        };
    }
    if lower.contains("login.microsoftonline.com") || lower.contains("sign in to your account") {
        return AppIdentity {
            app_name: "Microsoft Authentication".to_string(),
            context_title: None,
        };
    }
    if lower.contains("github.com/login") || lower.contains("sign in to github") {
        return AppIdentity {
            app_name: "GitHub Authentication".to_string(),
            context_title: None,
        };
    }

    // 2.5 Explicit User Examples (Static overrides for requested apps)
    if lower.contains("labsense") || lower.contains("lab sense") {
        return AppIdentity {
            app_name: "LabSense".to_string(),
            context_title: Some(page_title.to_string()),
        };
    }
    if lower.contains("whatsapp") {
        return AppIdentity {
            app_name: "WhatsApp".to_string(),
            context_title: Some("Active".to_string()),
        };
    }
    if lower.contains("chatgpt") || lower.contains("chat.openai.com") {
        return AppIdentity {
            app_name: "ChatGPT".to_string(),
            context_title: Some(page_title.to_string()),
        };
    }

    let mut cleaned = page_title;

    // 3. Dynamic Extraction
    if !cleaned.contains(' ') {
        // If it looks like a raw URL (no spaces), extract base domain
        if let Some(stripped) = cleaned.strip_prefix("https://") {
            cleaned = stripped;
        } else if let Some(stripped) = cleaned.strip_prefix("http://") {
            cleaned = stripped;
        }
        if let Some(pos) = cleaned.find(|c| c == '?' || c == '#' || c == '/') {
            cleaned = &cleaned[..pos];
        }
    } else {
        // Dynamic Title Splitting
        let separators = [" | ", " - ", " — ", " • ", " :: "];
        let mut best_segment = cleaned;

        for sep in separators {
            if cleaned.contains(sep) {
                let segments: Vec<&str> = cleaned.split(sep).collect();
                if let Some(last) = segments.last() {
                    let last_trimmed = last.trim();
                    let lower_last = last_trimmed.to_lowercase();

                    // Fallback to first segment if the last segment is generic
                    let generic_terms = [
                        "home", "dashboard", "login", "welcome", "index", "untitled", "new chat",
                        "getting started", "settings", "profile", "admin", "search", "results",
                    ];

                    if generic_terms.contains(&lower_last.as_str()) {
                        best_segment = segments.first().unwrap().trim();
                    } else {
                        best_segment = last_trimmed;
                    }
                    break;
                }
            }
        }
        cleaned = best_segment;
    }

    // 4. Strip trailing counters (e.g. "WhatsApp (2)" -> "WhatsApp")
    if let Some(pos) = cleaned.rfind(" (") {
        if cleaned.ends_with(')') {
            cleaned = cleaned[..pos].trim();
        }
    }

    if cleaned.is_empty() {
        return AppIdentity {
            app_name: "Browser".to_string(),
            context_title: None,
        };
    }

    let final_app_name = if cleaned.len() > 60 {
        format!("{}…", &cleaned[..57])
    } else {
        cleaned.to_string()
    };

    AppIdentity {
        app_name: final_app_name,
        context_title: Some(page_title.to_string()),
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
            hwnd: 0,
        }
    }

    #[test]
    fn test_browser_youtube() {
        let app = make_app("chrome.exe", "YouTube - Google Chrome");
        let id = normalize(&app, None);
        assert_eq!(id.app_name, "YouTube");
    }

    #[test]
    fn test_browser_chatgpt() {
        let app = make_app("msedge.exe", "ChatGPT - Microsoft Edge");
        let id = normalize(&app, None);
        assert_eq!(id.app_name, "ChatGPT");
    }

    #[test]
    fn test_browser_complex_title() {
        let app = make_app("chrome.exe", "React docs - Getting Started - Google Chrome");
        let id = normalize(&app, None);
        assert_eq!(id.app_name, "React docs");
    }

    #[test]
    fn test_known_app_vscode() {
        let app = make_app("Code.exe", "main.rs - labsense-agent");
        let id = normalize(&app, None);
        assert_eq!(id.app_name, "VS Code");
        assert_eq!(id.context_title, Some("main.rs - labsense-agent".to_string()));
    }

    #[test]
    fn test_known_app_powerpoint() {
        let app = make_app("POWERPNT.EXE", "Presentation1 - PowerPoint");
        let id = normalize(&app, None);
        assert_eq!(id.app_name, "PowerPoint");
    }

    #[test]
    fn test_known_app_word() {
        let app = make_app("WINWORD.EXE", "Document1 - Word");
        let id = normalize(&app, None);
        assert_eq!(id.app_name, "Word");
    }

    #[test]
    fn test_unknown_app_fallback() {
        let app = make_app("myapp.exe", "Some Window");
        let id = normalize(&app, None);
        assert_eq!(id.app_name, "Myapp");
    }

    #[test]
    fn test_browser_empty_title() {
        let app = make_app("chrome.exe", "");
        let id = normalize(&app, None);
        assert_eq!(id.app_name, "Browser");
    }

    #[test]
    fn test_browser_google_auth() {
        let app = make_app("chrome.exe", "accounts.google.com/signin/oauth/id?authuser=2&part=AJi8h - Google Chrome");
        let id = normalize(&app, None);
        assert_eq!(id.app_name, "Google Authentication");

        let app2 = make_app("msedge.exe", "Sign in - Google Accounts - Microsoft Edge");
        let id2 = normalize(&app2, None);
        assert_eq!(id2.app_name, "Google Authentication");
    }

    #[test]
    fn test_browser_url_stripping() {
        let app = make_app("brave.exe", "https://github.com/mohit-rajput-py/my-project - Brave");
        let id = normalize(&app, None);
        assert_eq!(id.app_name, "github.com");

        let app2 = make_app("chrome.exe", "localhost:3000/dashboard?token=123#hash - Google Chrome");
        let id2 = normalize(&app2, None);
        assert_eq!(id2.app_name, "localhost:3000");
    }

    #[test]
    fn test_browser_domain_based_normalization() {
        let app = make_app("chrome.exe", "LabSense | VTCBCSR - Google Chrome");
        let id = normalize(&app, None);
        assert_eq!(id.app_name, "LabSense");

        let app2 = make_app("msedge.exe", "Students | LabSense - Microsoft Edge");
        let id2 = normalize(&app2, None);
        assert_eq!(id2.app_name, "LabSense");

        let app3 = make_app("chrome.exe", "WhatsApp (2) - Google Chrome");
        let id3 = normalize(&app3, None);
        assert_eq!(id3.app_name, "WhatsApp");

        let app4 = make_app("brave.exe", "ChatGPT - New Chat - Brave");
        let id4 = normalize(&app4, None);
        assert_eq!(id4.app_name, "ChatGPT");
    }

    #[test]
    fn test_domain_from_uia() {
        let app = make_app("chrome.exe", "Runtime Config Architecture - ChatGPT - Google Chrome");
        let id = normalize(&app, Some("https://chatgpt.com/c/12345"));
        assert_eq!(id.app_name, "ChatGPT");
        assert_eq!(id.context_title.unwrap(), "Runtime Config Architecture - ChatGPT");
    }
    #[test]
    fn test_domain_extraction() {
        let parsed = url::Url::parse("https://docs.github.com/en").unwrap();
        let host = parsed.host_str().unwrap();
        let domain = addr::parse_domain_name(host).unwrap();
        assert_eq!(domain.root().unwrap(), "github.com");
    }
}
