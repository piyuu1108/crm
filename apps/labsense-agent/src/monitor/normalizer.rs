use crate::analytics::{AppIdentity, AppDetailIdentity};
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

/// Map browser exe names to friendly names.
static BROWSER_NAMES: LazyLock<HashMap<&'static str, &'static str>> = LazyLock::new(|| {
    let mut m = HashMap::new();
    m.insert("chrome.exe", "Google Chrome");
    m.insert("msedge.exe", "Microsoft Edge");
    m.insert("firefox.exe", "Firefox");
    m.insert("brave.exe", "Brave");
    m.insert("opera.exe", "Opera");
    m.insert("vivaldi.exe", "Vivaldi");
    m.insert("iexplore.exe", "Internet Explorer");
    m.insert("chromium.exe", "Chromium");
    m
});

/// Strips leading and trailing timer formats (e.g., "0:01 - ", "01:23:45 ") from titles.
fn strip_timer(title: &str) -> &str {
    let mut cleaned = title.trim();
    
    fn is_timer(s: &str) -> bool {
        let parts: Vec<&str> = s.split(':').collect();
        if parts.len() < 2 || parts.len() > 3 {
            return false;
        }
        parts.iter().all(|p| !p.is_empty() && p.len() <= 2 && p.chars().all(|c| c.is_ascii_digit()))
    }

    // Strip leading "MM:SS - " or "HH:MM:SS "
    if let Some(pos) = cleaned.find(" - ") {
        if is_timer(&cleaned[..pos]) {
            cleaned = &cleaned[pos + 3..];
        }
    } else if let Some(pos) = cleaned.find(' ') {
        if is_timer(&cleaned[..pos]) {
            cleaned = &cleaned[pos + 1..];
        }
    }

    // Strip trailing " - MM:SS" or " HH:MM:SS"
    if let Some(pos) = cleaned.rfind(" - ") {
        if is_timer(&cleaned[pos + 3..]) {
            cleaned = &cleaned[..pos];
        }
    } else if let Some(pos) = cleaned.rfind(' ') {
        if is_timer(&cleaned[pos + 1..]) {
            cleaned = &cleaned[..pos];
        }
    }

    if is_timer(cleaned) {
        return "";
    }

    cleaned.trim()
}

/// Strips common browser suffixes from window titles.
fn strip_browser_suffix(title: &str) -> &str {
    let suffixes = [
        " - Google Chrome",
        " - Microsoft Edge",
        " - Mozilla Firefox",
        " — Mozilla Firefox",
        " - Firefox",
        " — Firefox",
        " - Brave",
        " - Opera",
        " - Vivaldi",
        " - Internet Explorer",
        " - Chromium",
    ];

    let mut stripped = title;
    for suffix in suffixes.iter() {
        if stripped.ends_with(suffix) {
            stripped = &stripped[..stripped.len() - suffix.len()];
            break;
        }
    }
    stripped.trim()
}

/// Sanitize URL before storage to remove tokens and query params.
fn sanitize_url(url_str: &str) -> Option<String> {
    let mut parsed = url::Url::parse(url_str).ok()?;
    
    let allowed_params = ["v", "id", "q"];
    let mut pairs = Vec::new();
    for (k, v) in parsed.query_pairs() {
        if allowed_params.contains(&k.as_ref()) {
            pairs.push((k.into_owned(), v.into_owned()));
        }
    }
    
    parsed.set_query(None);
    if !pairs.is_empty() {
        let mut q = parsed.query_pairs_mut();
        for (k, v) in pairs {
            q.append_pair(&k, &v);
        }
        q.finish();
    }
    
    parsed.set_fragment(None);
    Some(parsed.to_string())
}

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

    let mut context_title = strip_timer(&app.window_title).to_string();
    if context_title.is_empty() {
        context_title = "Active".to_string();
    }

    // 2. Known application lookup
    if let Some(friendly) = APP_NAMES.get(process_lower.as_str()) {
        return AppIdentity {
            app_name: friendly.to_string(),
            detail: Some(AppDetailIdentity {
                title: Some(context_title),
                url: None,
                domain: None,
            }),
        };
    }

    // 3. Fallback: strip .exe, title-case
    AppIdentity {
        app_name: strip_and_titlecase(&app.process_name),
        detail: Some(AppDetailIdentity {
            title: Some(context_title),
            url: None,
            domain: None,
        }),
    }
}

fn normalize_domain(domain: &str) -> Option<&str> {
    match domain {
        // Specific host/subdomain mappings
        "localhost:8888" => Some("Jupyter Notebook"),
        "colab.research.google.com" => Some("Google Colab"),
        "docs.google.com" => Some("Google Docs"),
        "drive.google.com" => Some("Google Drive"),
        "meet.google.com" => Some("Google Meet"),
        "mail.google.com" => Some("Gmail"),
        "calendar.google.com" => Some("Google Calendar"),
        "web.whatsapp.com" => Some("WhatsApp Web"),

        // Root domain mappings
        "youtube.com" => Some("YouTube"),
        "github.com" => Some("GitHub"),
        "chatgpt.com" => Some("ChatGPT"),
        "openai.com" => Some("ChatGPT"),
        "amazon.in" => Some("Amazon"),
        "amazon.com" => Some("Amazon"),
        "aws.amazon.com" => Some("AWS"),
        "stackoverflow.com" => Some("Stack Overflow"),
        "google.com" => Some("Google"),
        "microsoft.com" => Some("Microsoft"),
        "notion.so" => Some("Notion"),
        "figma.com" => Some("Figma"),
        "linkedin.com" => Some("LinkedIn"),
        "twitter.com" => Some("X (Twitter)"),
        "x.com" => Some("X (Twitter)"),
        "facebook.com" => Some("Facebook"),
        "instagram.com" => Some("Instagram"),
        "reddit.com" => Some("Reddit"),
        "discord.com" => Some("Discord"),
        _ => None,
    }
}

/// Helper to normalize using an explicitly extracted URL/domain.
fn normalize_by_domain(url_str: &str, title: &str) -> AppIdentity {
    let page_title = strip_browser_suffix(title);
    let page_title = strip_timer(page_title);
    let page_title = if page_title.is_empty() { "Active" } else { page_title };

    let mut url_to_parse = url_str.trim().to_string();
    if !url_to_parse.starts_with("http://") && !url_to_parse.starts_with("https://") {
        url_to_parse = format!("https://{}", url_to_parse);
    }

    let parsed = match url::Url::parse(&url_to_parse) {
        Ok(p) => p,
        Err(_) => {
            return AppIdentity {
                app_name: "Browser".to_string(),
                detail: Some(AppDetailIdentity {
                    title: Some(page_title.to_string()),
                    url: None,
                    domain: None,
                }),
            };
        }
    };

    let host = match parsed.host_str() {
        Some(h) => h,
        None => {
            return AppIdentity {
                app_name: "Browser".to_string(),
                detail: Some(AppDetailIdentity {
                    title: Some(page_title.to_string()),
                    url: None,
                    domain: None,
                }),
            };
        }
    };

    let mut full_host = host.to_string();
    if let Some(port) = parsed.port() {
        full_host = format!("{}:{}", host, port);
    }

    let is_ip_or_localhost = host == "localhost" || host.chars().all(|c| c.is_ascii_digit() || c == '.');

    let mut root_domain = match addr::parse_domain_name(host) {
        Ok(domain) => {
            if let Some(root) = domain.root() {
                root.to_string()
            } else {
                host.to_string()
            }
        }
        Err(_) => host.to_string(),
    };

    if is_ip_or_localhost {
        root_domain = full_host.clone();
    }

    let app_name = if let Some(friendly) = normalize_domain(&full_host) {
        friendly.to_string()
    } else if let Some(friendly) = normalize_domain(&root_domain) {
        friendly.to_string()
    } else {
        if root_domain.contains(':') || root_domain.chars().all(|c| c.is_ascii_digit() || c == '.') {
            // It's likely an IP address or contains a port (like localhost:3000)
            root_domain.to_string()
        } else {
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
        }
    };

    let sanitized_url = sanitize_url(&url_to_parse);

    AppIdentity {
        app_name,
        detail: Some(AppDetailIdentity {
            title: Some(page_title.to_string()),
            url: sanitized_url,
            // Track the original root domain in the detail so it's clean,
            // or the full_host for IPs/localhosts.
            domain: Some(if is_ip_or_localhost { full_host } else { root_domain }),
        }),
    }
}


/// Parse browser window title when UIA domain extraction fails.
fn normalize_browser_title(title: &str, process: &str) -> AppIdentity {
    let browser_name = BROWSER_NAMES.get(process).unwrap_or(&"Browser");

    if title.is_empty() {
        return AppIdentity {
            app_name: browser_name.to_string(),
            detail: None,
        };
    }

    let page_title = strip_browser_suffix(title);
    let page_title = strip_timer(page_title);
    let page_title = if page_title.is_empty() { "Active" } else { page_title };

    let lower = page_title.to_lowercase();

    // 2. Auth Page Protection (Minimal static rule to prevent token leaks)
    if lower.contains("accounts.google.com")
        || lower.contains("sign in - google")
        || lower.contains("sign in – google")
    {
        return AppIdentity {
            app_name: "Google Authentication".to_string(),
            detail: None,
        };
    }
    if lower.contains("login.microsoftonline.com") || lower.contains("sign in to your account") {
        return AppIdentity {
            app_name: "Microsoft Authentication".to_string(),
            detail: None,
        };
    }
    if lower.contains("github.com/login") || lower.contains("sign in to github") {
        return AppIdentity {
            app_name: "GitHub Authentication".to_string(),
            detail: None,
        };
    }

    // 2.5 Explicit User Examples (Static overrides for requested apps)
    if lower.contains("labsense") || lower.contains("lab sense") {
        return AppIdentity {
            app_name: "LabSense".to_string(),
            detail: Some(AppDetailIdentity {
                title: Some(page_title.to_string()),
                url: None,
                domain: None,
            }),
        };
    }
    if lower.contains("whatsapp") {
        return AppIdentity {
            app_name: "WhatsApp".to_string(),
            detail: Some(AppDetailIdentity {
                title: Some("Active".to_string()),
                url: None,
                domain: None,
            }),
        };
    }
    if lower.contains("chatgpt") || lower.contains("chat.openai.com") {
        return AppIdentity {
            app_name: "ChatGPT".to_string(),
            detail: Some(AppDetailIdentity {
                title: Some(page_title.to_string()),
                url: None,
                domain: None,
            }),
        };
    }

    // 3. If URL extraction failed and we reach here, we DO NOT make the title the app_name.
    // The user's explicit instruction: "Browser page titles should NEVER become top-level application identities if domain normalization succeeded. Only fallback to title-as-app if URL extraction failed and no domain identity exists".
    // Actually, if we use the title as the top-level app, we just reintroduce the bug.
    // Instead, we use the browser's generic name as the top-level app.
    AppIdentity {
        app_name: browser_name.to_string(),
        detail: Some(AppDetailIdentity {
            title: Some(page_title.to_string()),
            url: None,
            domain: None,
        }),
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
        let id = normalize(&app, Some("https://youtube.com/watch"));
        assert_eq!(id.app_name, "YouTube");
        let detail = id.detail.unwrap();
        assert_eq!(detail.title.unwrap(), "YouTube");
        assert_eq!(detail.url.unwrap(), "https://youtube.com/watch");
        assert_eq!(detail.domain.unwrap(), "youtube.com");
    }

    #[test]
    fn test_browser_chatgpt() {
        let app = make_app("msedge.exe", "ChatGPT - Microsoft Edge");
        let id = normalize(&app, Some("https://chatgpt.com/"));
        assert_eq!(id.app_name, "ChatGPT");
        let detail = id.detail.unwrap();
        assert_eq!(detail.title.unwrap(), "ChatGPT");
        assert_eq!(detail.domain.unwrap(), "chatgpt.com");
    }

    #[test]
    fn test_browser_complex_title() {
        let app = make_app("chrome.exe", "React docs - Getting Started - Google Chrome");
        let id = normalize(&app, Some("https://react.dev/learn"));
        assert_eq!(id.app_name, "React");
        let detail = id.detail.unwrap();
        assert_eq!(detail.title.unwrap(), "React docs - Getting Started");
    }

    #[test]
    fn test_known_app_vscode() {
        let app = make_app("Code.exe", "main.rs - labsense-agent");
        let id = normalize(&app, None);
        assert_eq!(id.app_name, "VS Code");
        assert_eq!(id.detail.unwrap().title.unwrap(), "main.rs - labsense-agent");
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
        assert_eq!(id.app_name, "Google Chrome");
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
    fn test_browser_domain_based_normalization() {
        let app = make_app("chrome.exe", "LabSense | VTCBCSR - Google Chrome");
        let id = normalize(&app, Some("https://vtcbcsr.com"));
        assert_eq!(id.app_name, "Vtcbcsr"); // The capitalized root domain fallback

        let app3 = make_app("chrome.exe", "WhatsApp (2) - Google Chrome");
        let id3 = normalize(&app3, Some("https://web.whatsapp.com/"));
        assert_eq!(id3.app_name, "WhatsApp Web");
    }

    #[test]
    fn test_domain_from_uia() {
        let app = make_app("chrome.exe", "Runtime Config Architecture - ChatGPT - Google Chrome");
        let id = normalize(&app, Some("https://chatgpt.com/c/12345"));
        assert_eq!(id.app_name, "ChatGPT");
        let detail = id.detail.unwrap();
        assert_eq!(detail.title.unwrap(), "Runtime Config Architecture - ChatGPT");
        assert_eq!(detail.url.unwrap(), "https://chatgpt.com/c/12345");
        assert_eq!(detail.domain.unwrap(), "chatgpt.com");
    }

    #[test]
    fn test_url_sanitization() {
        // Strip unknown params
        let sanitized = sanitize_url("https://github.com/mohit-rajput-py?tab=repositories#123").unwrap();
        assert_eq!(sanitized, "https://github.com/mohit-rajput-py");

        // Preserve 'v'
        let sanitized2 = sanitize_url("https://youtube.com/watch?v=dQw4w9WgXcQ&feature=share").unwrap();
        assert_eq!(sanitized2, "https://youtube.com/watch?v=dQw4w9WgXcQ");

        // Preserve 'id'
        let sanitized3 = sanitize_url("https://docs.google.com/document/d/123/edit?id=456&usp=sharing").unwrap();
        assert_eq!(sanitized3, "https://docs.google.com/document/d/123/edit?id=456");
        
        // Preserve 'q'
        let sanitized4 = sanitize_url("https://google.com/search?q=rust+lang&client=edge").unwrap();
        assert_eq!(sanitized4, "https://google.com/search?q=rust+lang");
    }

    #[test]
    fn test_title_timer_stripping() {
        assert_eq!(strip_timer("0:01 - Song Name"), "Song Name");
        assert_eq!(strip_timer("01:23:45 - Movie Title"), "Movie Title");
        assert_eq!(strip_timer("Track 1 - 04:20"), "Track 1");
        assert_eq!(strip_timer("1:23:45 Video Title"), "Video Title");
        assert_eq!(strip_timer("Video Title 12:34"), "Video Title");
        // Should not strip real numbers
        assert_eq!(strip_timer("2001: A Space Odyssey"), "2001: A Space Odyssey");
        assert_eq!(strip_timer("12:34"), ""); // Only timer in title
    }
}
