# Deployment & Installer Guide

This guide explains how to brand your LabSense Agent executable (adding a logo), package it into an installer, and configure it to run automatically on Windows startup.

---

## 1. Adding a Logo / Icon to the `.exe`

By default, Rust builds executables with the generic Windows command-prompt icon. To embed your own logo:

1. Add the `winres` build dependency to your `Cargo.toml`:
   ```toml
   [build-dependencies]
   winres = "0.1"
   ```

2. Create a file named `build.rs` in the root of your project (next to `Cargo.toml`):
   ```rust
   // build.rs
   use std::io;
   
   fn main() -> io::Result<()> {
       if std::env::var("CARGO_CFG_TARGET_OS").unwrap() == "windows" {
           let mut res = winres::WindowsResource::new();
           res.set_icon("assets/logo.ico"); // Path to your .ico file
           res.compile()?;
       }
       Ok(())
   }
   ```

3. Place your `logo.ico` file in the `assets/` folder.
4. Run `cargo build --release`. The resulting `.exe` will now have your custom LabSense logo!

---

## 2. Registering as a Startup Program

Because LabSense needs to monitor usage in the background and survive logouts/reboots, running it as a **Windows Service** is highly recommended. 

### Method A: Windows Service (Highly Recommended)
Since the agent already has `windows-service` integrated, you can register it to start silently on boot before any user even logs in.

Open an **Administrator PowerShell** and run:
```powershell
# 1. Copy files to a permanent location
New-Item -Path "C:\Program Files\LabSense" -ItemType Directory
Copy-Item "labsense-agent.exe" "C:\Program Files\LabSense\"
Copy-Item "config.json" "C:\Program Files\LabSense\"

# 2. Register the service to start automatically
sc.exe create LabSenseAgent binPath= "C:\Program Files\LabSense\labsense-agent.exe --service" start= auto DisplayName= "LabSense Monitoring Agent"

# 3. Start the service immediately
sc.exe start LabSenseAgent
```

### Method B: Task Scheduler (Alternative Background Run)
If you don't want a Windows Service, Task Scheduler can run the agent on boot with Admin privileges.
```powershell
$action = New-ScheduledTaskAction -Execute "C:\Program Files\LabSense\labsense-agent.exe"
$trigger = New-ScheduledTaskTrigger -AtStartup
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "LabSenseAgent" -User "NT AUTHORITY\SYSTEM" -RunLevel Highest
```

### Method C: Windows Startup Folder (For Testing / Visible Console)
If you want the console to actually pop up when a student logs in (not recommended for production, but good for testing):
1. Press `Win + R` and type `shell:startup`
2. Create a shortcut to `labsense-agent.exe` in that folder.
*(Note: This only runs AFTER a user logs in, not on system boot).*

---

## 3. Creating a Proper Installer (`.exe` setup file)

Instead of manually copying files and running PowerShell commands on 50+ lab computers, you should create a professional Setup Installer (e.g., `LabSenseAgentSetup.exe`).

The industry standard for Windows is **Inno Setup** (it's free). 

1. Download and install [Inno Setup](https://jrsoftware.org/isinfo.php).
2. Save the following script as `installer.iss`.
3. Open it in Inno Setup and click **Compile**. It will generate a professional installer for you.

```pascal
; LabSense Agent Inno Setup Script
[Setup]
AppName=LabSense Agent
AppVersion=1.0.0
DefaultDirName={autopf}\LabSense
DefaultGroupName=LabSense
OutputDir=Output
OutputBaseFilename=LabSenseAgentSetup
SetupIconFile=assets\logo.ico
Compression=lzma
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64

[Files]
; The actual binaries and config to install
Source: "target\release\labsense-agent.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "config.json"; DestDir: "{app}"; Flags: ignoreversion

[Run]
; 1. Register the Windows Service
Filename: "{sys}\sc.exe"; Parameters: "create LabSenseAgent binPath= ""{app}\labsense-agent.exe --service"" start= auto DisplayName= ""LabSense Monitoring Agent"""; Flags: runhidden

; 2. Start the Service
Filename: "{sys}\sc.exe"; Parameters: "start LabSenseAgent"; Flags: runhidden

[UninstallRun]
; Clean up when uninstalled
Filename: "{sys}\sc.exe"; Parameters: "stop LabSenseAgent"; Flags: runhidden; RunOnceId: "StopService"
Filename: "{sys}\sc.exe"; Parameters: "delete LabSenseAgent"; Flags: runhidden; RunOnceId: "DeleteService"
```

### What the installer does automatically:
1. Copies the `.exe` and `config.json` to `C:\Program Files\LabSense`.
2. Creates an uninstaller.
3. Registers the `.exe` as an auto-start Windows Service.
4. Boots up the agent immediately.
5. Cleans up everything seamlessly if uninstalled via the Windows Control Panel.
