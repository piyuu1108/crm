# Runtime Configuration & Application Analytics Architecture


## Overview

The monitoring agent follows a **server-authoritative, runtime-configurable architecture** designed for institutional environments such as computer labs, classrooms, libraries, and examination systems.

The system focuses on:

* lightweight application analytics
* centralized runtime control
* low operational complexity
* scalable deployment
* minimal agent-side configuration

The agent itself remains intentionally lightweight.
Most operational behavior is dynamically controlled by the server during login.

---

# Core Architectural Philosophy

The system is designed as:

```text
Analytics-first, not surveillance-first
```

The goal is to generate meaningful institutional usage summaries rather than invasive low-level monitoring.

The architecture prioritizes:

* aggregated analytics
* normalized application tracking
* centralized configuration
* safe distributed synchronization
* operational simplicity

---

# High-Level System Architecture

```text
┌─────────────────────┐
│   Central Server    │
│                     │
│ - Authentication    │
│ - Runtime Config    │
│ - Session Control   │
│ - Analytics Storage │
└─────────┬───────────┘
          │
          │ HTTP
          │
┌─────────▼───────────┐
│   Windows Agent     │
│                     │
│ - Local UI          │
│ - Application Monitor
│ - Idle Detection    │
│ - Runtime Analytics │
│ - Periodic Sync     │
└─────────────────────┘
```

---

# Installation Phase

The institutional installer performs:

* Windows service installation
* startup registration
* local configuration setup
* firewall configuration (if required)

Example local configuration:

```json
{
  "serverUrl": "http://192.168.1.50:1108",
  "pcName": "LAB-3/168"
}
```

---

# Windows Service Runtime

The agent runs as a Windows service and automatically starts during system boot.

Responsibilities include:

* local web UI hosting
* foreground application monitoring
* idle detection
* analytics aggregation
* periodic synchronization

This architecture ensures the system works silently in the background without requiring manual startup by students.

---

# Local Student Interface

The agent hosts a local-only HTTP interface:

```text
http://127.0.0.1:21211
```

The local interface provides:

* student login
* session status
* connectivity feedback

## Advantages

* no public exposure
* no cloud dependency
* browser-based UI
* easier future updates
* lightweight deployment

---

# Authentication Flow

Students authenticate using institutional credentials.

Example login request:

```http
POST /api/agent/login
```

Request includes:

* student ID
* password
* MAC address
* configured PC name
* optional lab information

---

# Runtime Configuration System

## Server-Authoritative Configuration

The server dynamically controls runtime behavior.

The agent does not hardcode operational thresholds.

This allows institutions to adjust behavior without redeploying agents.

---

# Why Runtime Configuration Matters

Different environments require different inactivity behavior.

Examples:

| Environment        | Recommended Idle Threshold |
| ------------------ | -------------------------- |
| Coding Lab         | 120 seconds                |
| Reading/Theory Lab | 240 seconds                |
| Examination Mode   | 30 seconds                 |

Hardcoded thresholds would make the system inflexible and difficult to maintain.

Dynamic runtime configuration is the correct long-term design.

---

# Login Response Structure

After successful authentication, the server returns:

```json
{
  "sessionId": "sess_abc123",

  "syncIntervalSeconds": 30,
  "syncJitterSeconds": 30,
  "timeoutSeconds": 120,
  "idleThresholdSeconds": 120
}
```

---

# Runtime Configuration Parameters

| Key                  | Example | Purpose                             |
| -------------------- | ------- | ----------------------------------- |
| syncIntervalSeconds  | 30      | Base synchronization interval       |
| syncJitterSeconds    | 30      | Prevent synchronized traffic spikes |
| timeoutSeconds       | 120     | Session timeout threshold           |
| idleThresholdSeconds | 120     | User inactivity threshold           |

---

# Agent Runtime Behavior

After login:

```text
agent_config = server_response.runtime_config
```

The agent dynamically applies these values during execution.

This controls:

* sync scheduling
* retry timing
* timeout handling
* idle detection behavior

No redeployment is required when institutional policies change.

---

# Application Monitoring System

The agent continuously monitors:

* foreground process
* active window title
* keyboard input
* mouse input

Polling occurs approximately every second.

---

# Application Normalization

Raw process information is transformed into normalized application names.

Examples:

| Raw Input            | Stored Application |
| -------------------- | ------------------ |
| chrome.exe + YouTube | YouTube            |
| chrome.exe + ChatGPT | ChatGPT            |
| Code.exe             | VSCode             |
| POWERPNT.EXE         | PowerPoint         |

This creates cleaner analytics and improves reporting quality.

---

# Runtime Analytics Aggregation

The agent internally aggregates analytics using cumulative counters.

Example structure:

```rust
HashMap<ApplicationName, Counters>
```

Each application stores:

```rust
total_seconds
active_seconds
idle_seconds
```

Global totals are also maintained.

---

# Idle Detection Architecture

The idle system is state-driven rather than naïve polling.

---

# Idle Detection Flow

## Step 1 — User Interaction

Whenever keyboard or mouse activity occurs:

```text
last_input_at = now
```

---

## Step 2 — Threshold Evaluation

If:

```text
current_time - last_input_at > idle_threshold_seconds
```

the current application transitions into an idle state.

---

## Step 3 — Counter Updates

When idle:

* global idle increases
* application idle increases

Otherwise:

* active counters increase

This architecture is:

* deterministic
* analytics-friendly
* easy to debug
* operationally stable

---

# Recommended Idle Threshold Strategy

## Recommended MVP Design

Use a single global threshold:

```text
idle_threshold_seconds
```

This is strongly recommended for the initial system version.

---

# Why Single Threshold Is Better Initially

A global threshold provides:

* simpler administration
* easier debugging
* cleaner analytics
* fewer edge cases
* predictable behavior

---

# Avoid Early Complexity

Initially avoid per-category thresholds such as:

```json
{
  "coding": 120,
  "reading": 240
}
```

because they introduce:

* classification ambiguity
* inconsistent analytics
* higher maintenance complexity
* difficult operational debugging

---

# Future Expansion Possibility

Advanced policies may later support:

```json
{
  "idlePolicies": {
    "coding": 120,
    "reading": 240,
    "video": 60
  }
}
```

However, this should only be introduced after:

* classification maturity
* analytics validation
* real institutional demand

---

# Synchronization Architecture

The agent periodically synchronizes session analytics with the server.

Synchronization occurs every:

```text
syncIntervalSeconds + random(syncJitterSeconds)
```

---

# Sync Request

```http
PATCH /api/sessions/:id
```

The agent sends cumulative totals instead of incremental deltas.

---

# Why Cumulative Synchronization Matters

Cumulative synchronization provides important distributed-system advantages:

* retry-safe
* reconnect-safe
* duplicate-request-safe
* overwrite-safe

This is a professional synchronization strategy commonly used in resilient distributed systems.

---

# Example Analytics Payload

```json
{
  "totalSeconds": 600,
  "activeSeconds": 480,
  "idleSeconds": 120,

  "applications": [
    {
      "applicationName": "ChatGPT",
      "totalSeconds": 300,
      "activeSeconds": 250,
      "idleSeconds": 50
    },
    {
      "applicationName": "Power BI",
      "totalSeconds": 200,
      "activeSeconds": 180,
      "idleSeconds": 20
    }
  ]
}
```

---

# Server Timeout Handling

The server tracks the last successful synchronization time.

If:

```text
last_sync_at > timeout_seconds
```

the session is automatically completed.

Example:

```text
end_reason = timeout
```

This ensures abandoned sessions are cleaned automatically.

---

# Major Architectural Advantage

Because runtime behavior is centrally controlled:

```text
Agents automatically adapt after the next login
```

Benefits include:

* no redeployment
* no installer updates
* centralized operational tuning
* simplified maintenance

This is a strong architectural property for institutional deployments.

---

# Operational Benefits

## For Institutions

* centralized control
* configurable runtime behavior
* easier administration
* scalable deployments

---

## For Infrastructure

* lightweight agents
* low maintenance overhead
* simplified updates
* resilient synchronization

---

## For Analytics

* consistent application reporting
* normalized usage summaries
* easier debugging
* cleaner institutional insights

---

# Final Architectural Assessment

This architecture represents a scalable and deployable institutional analytics system rather than a simple monitoring script.

The design provides:

* centralized runtime control
* lightweight agent execution
* scalable synchronization
* clean analytics aggregation
* maintainable operational behavior
* future extensibility

while remaining operationally simple and institution-friendly.
