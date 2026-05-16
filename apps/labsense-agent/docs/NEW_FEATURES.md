````text id="x7m4qa"
Implement runtime-configurable analytics feature gating to reduce actual runtime memory usage and allow server-controlled telemetry detail levels.

Goals:
- Keep the agent lightweight on low-end Windows lab PCs.
- Avoid unnecessary allocations when advanced analytics are disabled.
- Allow the backend to dynamically control analytics granularity.
- Ensure disabled features do not consume meaningful runtime memory.

Requirements:

1. Extend login response configuration.

The login response must now including:

```json
{
    "sessionId": "c6cca8a0-1fda-4d10-8df5-483e87edcb9b",
    "syncIntervalSeconds": 30,
    "syncJitterSeconds": 30,
    "timeoutSeconds": 120,
    "idleThresholdSeconds": 120,
    "enableDetails": false,
    "enableSegments": true,
    "maxSegmentsPerApp": 50,
    "maxSegmentsPerDetail": 20,
    "minimumTrackedSeconds": 15,
    "candidateRetentionMinutes": 10
}
````

These settings must be stored in runtime config and applied immediately for the active session.

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

4. Segment retention behavior.

When segment limits are exceeded:

* evict the shortest-duration segment
* NOT the oldest segment

This preserves meaningful activity history while removing transient/noisy segments.

Protect currently active segments from eviction.

5. Segment limits.

Apply limits separately:

* `maxSegmentsPerApp`
* `maxSegmentsPerDetail`

These limits must be enforced continuously during runtime.

6. Memory optimization requirements.

Implementation should:

* avoid allocating unused Vec collections
* avoid cloning strings unnecessarily
* aggressively reuse active segment objects
* avoid duplicate detail entries
* avoid transient activity allocations

Do not allocate detail/segment structures unless the corresponding feature is enabled.

7. Browser hierarchy behavior.

When browser/domain normalization succeeds:

* top-level app identity must remain stable
* titles/pages belong only inside details

Correct:

* ChatGPT

  * Runtime Config Architecture
  * Fixing Chrono Timezones

Incorrect:

* Runtime Config Architecture as top-level app

8. Segment creation rules.

Do NOT create segments every second.

Create/rotate segments only when:

* app changes
* meaningful title changes
* domain changes
* idle/active state changes significantly

Otherwise extend the existing active segment.

9. URL handling.

Continue:

* sanitizing URLs
* removing sensitive query parameters
* avoiding token persistence
* protecting authentication pages

10. Keep PATCH sync architecture.

The existing PATCH sync model must remain unchanged.

Advanced analytics data should:

* remain compact
* merge naturally into existing payloads
* avoid unbounded payload growth

11. Add tests.

Add tests covering:

* details disabled → no detail allocations
* segments disabled → no segment allocations
* shortest-segment eviction
* active segment protection
* browser hierarchy correctness
* bounded memory behavior
* segment reuse/extension
* runtime config application

This feature focuses strictly on runtime configurability, memory optimization, and analytics feature gating.

Do NOT change existing business logic or telemetry behavior unrelated to runtime optimization.

In particular, preserve existing implementations for:
- URL parsing
- URL sanitization
- domain normalization
- activity classification
- idle detection
- sync transport behavior
- PATCH payload flow
- aggregation semantics
- browser detection logic

Only introduce the minimum structural changes required to:
- support runtime-configurable analytics levels
- reduce runtime memory usage
- avoid unnecessary allocations
- enforce bounded analytics retention
- apply feature gating safely at runtime

The existing observable analytics behavior should remain unchanged when all features are enabled.

```
```