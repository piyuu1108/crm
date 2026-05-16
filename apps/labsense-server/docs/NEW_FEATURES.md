Here’s the combined refined prompt 🌸 

````text id="x7m4qa"
Implement runtime-configurable analytics feature gating, lightweight timeline tracking, and candidate activity expiration to reduce actual runtime memory usage while allowing server-controlled telemetry granularity.

Goals:
- Keep the agent lightweight on low-end Windows lab PCs.
- Avoid unnecessary allocations when advanced analytics are disabled.
- Prevent silent long-term memory growth from transient browser noise.
- Allow the backend to dynamically control analytics behavior.
- Preserve bounded-memory and scalable aggregation architecture.
- Maintain lightweight cumulative aggregation instead of raw event logging.

Requirements:

1. Extend login response configuration.

The login response must now include:

```json
{
  "enableDetails": true,
  "enableSegments": true,

  "maxSegmentsPerApp": 50,
  "maxSegmentsPerDetail": 20,

  "idleThresholdSeconds": 120,

  "minimumTrackedSeconds": 15,

  "candidateRetentionMinutes": 10
}
````

These settings must:

* be stored in runtime config
* apply immediately for the active session
* dynamically control runtime behavior without redeployment

2. Runtime feature gating.

Critical requirement:
Disabled features must NOT merely be hidden during sync.

They must avoid actual runtime allocations and tracking work.

Examples:

If `enableDetails = false`:

* do not create detail objects
* do not allocate detail vectors
* do not store titles
* do not store URLs/domains
* do not perform detail aggregation

If `enableSegments = false`:

* do not create segment vectors
* do not allocate timestamp objects
* do not track timeline state
* do not create/update segments

The goal is real runtime memory reduction, not cosmetic payload reduction.

3. Preserve base aggregation.

Even with all advanced features disabled:

* totalSeconds
* activeSeconds
* idleSeconds
* top-level application aggregation

must continue functioning normally.

4. Global idle threshold behavior.

The agent must use:

```json
{
  "idleThresholdSeconds": 120
}
```

as the global inactivity threshold for determining idle state.

Requirements:

* evaluated continuously during runtime
* applied consistently across all applications/sites
* used for:

  * app aggregation
  * detail aggregation
  * segment tracking

When no input/activity is detected for the configured duration:

* activity becomes idle
* idleSeconds should accumulate

5. Configurable minimum activity retention.

The agent currently ignores activities shorter than 15 seconds.

This behavior must become runtime-configurable using:

```json
{
  "minimumTrackedSeconds": 15
}
```

Critical behavior:
This threshold represents cumulative/global tracked duration for the current session activity identity — NOT per sync interval.

Correct behavior:

* activity durations accumulate continuously across sync cycles
* once cumulative duration reaches threshold, the activity becomes eligible for storage/sync
* accumulated duration must NOT reset every PATCH sync

Example:

* ChatGPT used for 5s
* later another 6s
* later another 7s

Total:

* 18s

Result:

* activity becomes retained and synced

Incorrect behavior:

* evaluating threshold independently per PATCH window

Requirements:

* activities below threshold should remain temporary candidates
* applies to apps/details/segments
* should reduce transient noise and memory usage

6. Introduce two-layer activity tracking.

Separate activity storage into:

A) Confirmed Activities
Activities which crossed:

```json
{
  "minimumTrackedSeconds": 15
}
```

These:

* remain stored normally for the session
* participate in sync payloads
* are NOT affected by candidate expiration cleanup

B) Candidate Activities
Activities BELOW the threshold.

These should:

* exist only temporarily
* accumulate duration while being observed
* become confirmed once threshold is crossed

7. Candidate activity model.

Implement lightweight candidate tracking similar to:

```rust
CandidateActivity {
    first_seen,
    last_seen,
    cumulative_seconds
}
```

Candidates should remain lightweight and temporary.

8. Candidate expiration behavior.

Problem examples:

* oauth pages
* redirects
* temporary tabs
* tracking URLs
* accidental focus switches
* short-lived browser noise

These may:

* appear for 1–5 seconds
* never cross the threshold
* never become confirmed tracked activities

BUT currently remain stored forever in memory.

This causes silent long-term memory growth.

Solution:
Remove candidate activities if BOTH conditions are true:

Condition 1:

* candidate has not been seen recently

```text
now - last_seen > candidateRetentionMinutes
```

Condition 2:

* candidate still has not crossed:

```json
{
  "minimumTrackedSeconds": 15
}
```

Meaning:

* inactive transient activities should expire automatically
* memory must be reclaimed continuously during runtime

9. Important cleanup restriction.

Candidate expiration cleanup must ONLY apply to:

* unconfirmed candidate activities

It must NOT remove:

* confirmed tracked activities
* synced session aggregation
* confirmed segments/details

10. Segment retention behavior.

When segment limits are exceeded:

* evict the shortest-duration segment
* NOT the oldest segment

This preserves meaningful activity history while removing transient/noisy segments.

Protect currently active segments from eviction.

11. Segment limits.

Apply limits separately:

* `maxSegmentsPerApp`
* `maxSegmentsPerDetail`

These limits must be enforced continuously during runtime.

12. Segment creation rules.

Do NOT create segments every second.

Create/rotate segments only when:

* app changes
* meaningful title changes
* domain changes
* idle/active state changes significantly

Otherwise extend the existing active segment.

13. Memory optimization requirements.

Implementation should:

* aggressively clean expired candidates
* avoid allocating unused Vec collections
* avoid cloning strings unnecessarily
* aggressively reuse active segment objects
* avoid duplicate detail entries
* avoid transient activity allocations
* avoid retaining unused URLs/titles indefinitely

Examples:

* avoid creating detail entries for filtered transient activities
* avoid segment allocations for discarded activities
* avoid storing titles/URLs below threshold

Do not allocate detail/segment structures unless the corresponding feature is enabled.

The goal is real runtime memory stabilization during long-running sessions.

14. Browser hierarchy behavior.

When browser/domain normalization succeeds:

* top-level app identity must remain stable
* titles/pages belong only inside details

Correct:

* ChatGPT

  * Runtime Config Architecture
  * Fixing Chrono Timezones

Incorrect:

* Runtime Config Architecture as top-level app

15. URL handling.

Continue:

* sanitizing URLs
* removing sensitive query parameters
* avoiding token persistence
* protecting authentication pages

16. Keep PATCH sync architecture.

The existing PATCH sync model must remain unchanged.

Advanced analytics data should:

* remain compact
* merge naturally into existing payloads
* avoid unbounded payload growth

17. Add tests.

Add tests covering:

* details disabled → no detail allocations
* segments disabled → no segment allocations
* global idle threshold behavior
* minimumTrackedSeconds cumulative behavior
* transient activity discard
* candidate expiration
* candidate promotion to confirmed activity
* cleanup after retention timeout
* confirmed activities surviving cleanup
* shortest-segment eviction
* active segment protection
* browser hierarchy correctness
* transient browser noise removal
* bounded memory behavior
* segment reuse/extension
* runtime config application

```
```