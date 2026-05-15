use windows::Win32::Foundation::HWND;
use windows::Win32::UI::Accessibility::{
    CUIAutomation, IUIAutomation, IUIAutomationElement, IUIAutomationValuePattern,
    TreeScope_Descendants, UIA_ControlTypePropertyId, UIA_EditControlTypeId, UIA_ValuePatternId,
};

use windows::Win32::System::Com::{CoCreateInstance, CLSCTX_ALL};

/// Attempt to extract the URL from the browser's address bar using UIAutomation.
/// This assumes CoInitializeEx has already been called on the calling thread.
pub fn extract_browser_url(hwnd: isize) -> Option<String> {
    unsafe {
        // Attempt to instantiate IUIAutomation. This might fail if COM isn't initialized.
        let automation: IUIAutomation =
            CoCreateInstance(&CUIAutomation, None, CLSCTX_ALL).ok()?;

        // Get the IUIAutomationElement for the window
        let window_el: IUIAutomationElement = automation
            .ElementFromHandle(HWND(hwnd as *mut core::ffi::c_void))
            .ok()?;

        // Condition: ControlType == EditControl
        let condition = automation
            .CreatePropertyCondition(
                UIA_ControlTypePropertyId,
                &windows::core::VARIANT::from(UIA_EditControlTypeId.0),
            )
            .ok()?;

        // Find the first matching element (usually the address bar is found early)
        let edit_el = window_el.FindFirst(TreeScope_Descendants, &condition).ok()?;

        // Get the Value pattern
        let pattern: IUIAutomationValuePattern =
            edit_el.GetCurrentPatternAs(UIA_ValuePatternId).ok()?;

        let value = pattern.CurrentValue().ok()?;
        let url = value.to_string();

        if url.is_empty() {
            None
        } else {
            Some(url)
        }
    }
}
