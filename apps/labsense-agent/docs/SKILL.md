# SKILL.md

Project Context

This project is an institutional Windows monitoring and analytics agent designed for deployment inside a college LAN environment.

The system is intended for:

Windows 10 lab computers
local institutional networks
centralized analytics
lightweight operational monitoring
educational lab management

The project is developed by a student without access to expensive enterprise infrastructure such as:

EV code signing certificates
enterprise MDM systems
commercial deployment tooling
enterprise publisher verification

Because of this, the architecture and implementation must prioritize:

professional engineering practices
clean system behavior
operational transparency
low false-positive security behavior
maintainable deployment patterns

The goal is to behave like a legitimate institutional application, not like consumer malware or surveillance software.

## Environment

- Target OS: Windows 10
- Deployment: College LAN
- Type: Institutional analytics agent
- Developer: Student project without enterprise publisher certificate

---

## Core Goal

The agent must behave like professional institutional software, not malware.

Focus on:

- clean architecture
- stable runtime behavior
- transparent installation
- low resource usage
- predictable networking
- proper metadata

---

## Windows Service

| Property | Example |
|---|---|
| Service Name | LabSenseAgent |
| Display Name | LabSense Agent |
| Description | Institutional Analytics Service |

Requirements:

- auto-start on boot
- graceful shutdown
- proper restart recovery
- stable service naming

---

## Installation Standards

Use stable install path:

```text
C:\Program Files\LabSense\
```

Avoid:

- random folder names
- temp execution
- hidden persistence
- unsigned PowerShell scripts

Installer should support:

- uninstall
- versioning
- firewall rule creation
- proper shortcuts

---

## Executable Metadata

Always include:

- Product Name
- File Description
- Company Name
- File Version
- Product Version
- Original Filename

Example:

| Field | Example |
|---|---|
| Product Name | LabSense Agent |
| File Description | Institutional Analytics Agent |
| Company Name | LabSense |

---

## Defender & Reputation

Without code signing, reputation matters heavily.

Avoid:

- UPX packing
- obfuscation
- DLL injection
- keyboard hooks
- anti-debug tricks
- privilege escalation
- registry abuse

Prefer:

- stable builds
- predictable behavior
- common libraries
- transparent networking

---

## Networking

Architecture:

```text
Agent → Local Server
```

Use:

- normal HTTP APIs
- stable ports
- predictable sync intervals

Avoid:

- peer-to-peer behavior
- hidden connections
- arbitrary remote execution

---

## Monitoring Philosophy

This system is:

```text
analytics-first
```

NOT:

```text
spyware-first
```

Track:

- application analytics
- activity summaries
- session statistics

Avoid:

- screenshots
- clipboard capture
- keystroke logging
- personal file scanning

---

## Runtime Standards

The agent must remain lightweight.

Targets:

- low CPU usage
- low RAM usage
- minimal disk writes
- graceful offline handling

Lab PCs should never feel slowed down.

---

## Long-Term Goal

Future improvements may include:

- OV/EV code signing
- MSI installer
- HTTPS
- centralized updates

But MVP priority is:

```text
simple
stable
professional
maintainable
```