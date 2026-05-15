# Quickstart: Testing on Another PC

This guide explains the absolute minimal way to test your compiled `labsense-agent.exe` on a different computer.

## Do I need an installer?
**No.** You do not need an installer just to test the application. The installer (Inno Setup) is only required when you want to mass-deploy the agent silently as a background Windows Service across 50+ lab computers.

## Can I run it directly on double-click?
**Yes.** Because we compiled the agent as a standalone executable (and all the HTML/CSS is embedded inside it), it runs perfectly just by double-clicking it.

---

## The Minimal Test Process

### Step 1: Copy the Files
You only need exactly **two files** to run the agent. Copy these files onto a USB drive or transfer them to the target PC:
1. `target/release/labsense-agent.exe` (Your compiled 4MB application)
2. `config.json` (Your configuration file containing the server URL)

*Important: Make sure both files are in the same folder on the target PC.*

### Step 2: Run the Agent
1. **Double-click** `labsense-agent.exe`.
2. A black command prompt (Console Window) will appear. This means the agent is running in **Console Mode**.
3. You will immediately see live logs appearing in the black window, showing what the agent is detecting.
4. The agent will **automatically open the default web browser** to `http://127.0.0.1:21211` so the student can log in.

### Step 3: Verify the Test
- Log in using a test College ID.
- Minimize the browser, open some applications (like Notepad or File Explorer), and watch the black console window.
- You will see logs indicating that the agent is tracking activity and syncing it to your `config.json` server URL.

### Step 4: Stop the Test
To completely stop the agent and end the test, simply click the **"X"** on the black console window to close it.

---

## Summary
- **For Testing / Debugging**: Just double-click the `.exe` (Console Mode). You get a visible window with live logs.
- **For Final Lab Deployment**: Use the Installer/Windows Service method (detailed in `DEPLOYMENT.md`). The agent runs invisibly in the background with no black windows.
