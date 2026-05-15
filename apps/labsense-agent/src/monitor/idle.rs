use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};

/// Returns the number of seconds the user has been idle (no keyboard/mouse input).
pub fn get_idle_seconds() -> u64 {
    unsafe {
        let mut lii = LASTINPUTINFO {
            cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
            dwTime: 0,
        };

        if GetLastInputInfo(&mut lii).as_bool() {
            let tick_count = windows::Win32::System::SystemInformation::GetTickCount();
            let idle_ms = tick_count.wrapping_sub(lii.dwTime);
            (idle_ms / 1000) as u64
        } else {
            0
        }
    }
}

/// Check if the user is currently idle based on the given threshold.
pub fn is_idle(threshold_seconds: u64) -> bool {
    get_idle_seconds() >= threshold_seconds
}
