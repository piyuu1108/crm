use sysinfo::{System, Pid};
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{
    GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId,
};

/// Information about the currently focused application.
#[derive(Debug, Clone)]
pub struct ForegroundApp {
    pub process_name: String,
    pub window_title: String,
    pub pid: u32,
    pub hwnd: isize,
}

/// Gets the currently focused foreground application.
/// Returns None if no window is focused or information cannot be retrieved.
pub fn get_foreground_app(sys: &mut System) -> Option<ForegroundApp> {
    unsafe {
        let hwnd: HWND = GetForegroundWindow();
        if hwnd.0.is_null() {
            return None;
        }

        // Get process ID from window handle
        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        if pid == 0 {
            return None;
        }

        // Get window title
        let window_title = get_window_title(hwnd);

        // Get process name via sysinfo
        sys.refresh_processes(
            sysinfo::ProcessesToUpdate::Some(&[Pid::from_u32(pid)]),
            true,
        );
        let process_name = sys
            .process(Pid::from_u32(pid))
            .map(|p| p.name().to_string_lossy().to_string())
            .unwrap_or_else(|| "Unknown".to_string());

        Some(ForegroundApp {
            process_name,
            window_title,
            pid,
            hwnd: hwnd.0 as isize,
        })
    }
}

/// Retrieves the window title text for a given HWND.
unsafe fn get_window_title(hwnd: HWND) -> String {
    let mut buf = [0u16; 512];
    let len = GetWindowTextW(hwnd, &mut buf);
    if len > 0 {
        String::from_utf16_lossy(&buf[..len as usize])
    } else {
        String::new()
    }
}
