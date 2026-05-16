# Implementation Plan: Hierarchical Activity Timeline Tracking

## Goal
Implement a lightweight, bounded timeline feature by tracking segments (`startedAt` and `endedAt`) per application and per nested detail, while avoiding raw event streams and per-second noise.

## Proposed Changes

### 1. Update Models (`src/analytics.rs`)
[MODIFY] `p:\02_projects\mono\apps\labsense-agent\src\analytics.rs`
- Add `SegmentPayload` structure:
  ```rust
  #[derive(Debug, Clone, Serialize)]
  #[serde(rename_all = "camelCase")]
  pub struct SegmentPayload {
      pub started_at: String,
      pub ended_at: String,
  }
  ```
- Add `pub segments: Vec<SegmentPayload>` to both `AppUsagePayload` and `AppUsageDetailPayload`.
- Create internal memory tracking structures:
  ```rust
  #[derive(Debug, Clone)]
  pub struct Segment {
      pub started_at: chrono::DateTime<chrono::Utc>,
      pub ended_at: chrono::DateTime<chrono::Utc>,
  }
  ```
- Add `pub segments: Vec<Segment>` to `AppCounters` and `AppDetailCounters`.

### 2. Segment Management Logic (`src/analytics.rs`)
[MODIFY] `p:\02_projects\mono\apps\labsense-agent\src\analytics.rs`
- In `SessionAnalytics::tick()`, handle segment updates for the active application and detail.
- **Rule**: If `is_idle` is `false`:
  - Fetch the last segment in the array.
  - If it ended within a very short threshold (e.g., 2 seconds, which covers the ~1s tick interval), just **extend** `ended_at` to the current time.
  - If the gap is larger (meaning the user switched away, went idle, or closed the app), push a **new** `Segment`.
- **Memory Bound**: Keep the segment array truncated to a strict limit (e.g., maximum 50 segments per app/detail) by removing the oldest segments to avoid unbounded timeline growth over long sessions.
- In `snapshot()`, convert the internal `Segment` array to `SegmentPayload` strings using RFC 3339 format.

### 3. Add Tests (`src/analytics.rs`)
[MODIFY] `p:\02_projects\mono\apps\labsense-agent\src\analytics.rs`
- Add unit tests verifying:
  - Continuous active ticks correctly extend a single segment.
  - A break in time (or idle transition) correctly causes a new segment to spawn.
  - Bounded memory rules accurately limit array size.

## Open Questions
- Is capping the segments array at 50 entries per app/detail sufficient to fulfill timeline inspection requirements while maintaining memory bounds?
