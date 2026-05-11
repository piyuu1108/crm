/**
 * profiler.ts — Lightweight CPU-time estimation utility for Next.js / Cloudflare Workers
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * WHY CLOUDFLARE CPU TIME DIFFERS FROM WALL-CLOCK TIME
 * ──────────────────────────────────────────────────────────────────────────────
 * Cloudflare Workers bill on **CPU time**, not total request duration (wall time).
 * Wall time = CPU execution + time spent waiting on I/O (DB queries, Redis, fetch).
 * When a Worker is `await`-ing a network call, the V8 isolate is suspended and
 * another request can be handled. The Worker is NOT consuming CPU during that wait.
 *
 * Example:
 *   Wall time  = 320 ms  (what `Date.now()` would show end-to-end)
 *   CPU time   =  18 ms  (actual JS execution, token verification, JSON.stringify, etc.)
 *   I/O wait   = 302 ms  (DB + Redis + fetch calls sitting in event loop queue)
 *
 * Cloudflare bills only the 18 ms. Misidentifying wall time as CPU time will cause
 * you to dramatically over-optimize the wrong things.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * WHY ASYNC WAITING MUST NOT COUNT AS CPU EXECUTION
 * ──────────────────────────────────────────────────────────────────────────────
 * JavaScript is single-threaded. `await asyncCall()` suspends the current
 * microtask and yields control back to the event loop. No JS runs during that
 * suspension. Counting the suspension duration as "CPU time" would be like
 * counting the time you're asleep as "working time."
 *
 * Our strategy:
 *   - Wrap every I/O call with `measureAsyncWait()` — record only the I/O span.
 *   - Everything between those spans (parsing, logic, serialization) is CPU time.
 *   - CPU time ≈ totalDuration − sum(all I/O waits)
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ACCURACY LIMITATIONS vs. ACTUAL CLOUDFLARE ANALYTICS
 * ──────────────────────────────────────────────────────────────────────────────
 * This is an *estimation*, not ground truth. Gaps exist because:
 *
 * 1. `performance.now()` has ~0.1 ms resolution in Workers (timer coarsening).
 * 2. Microtask scheduling between awaits adds untracked sub-ms CPU slices.
 * 3. V8 GC pauses are invisible to userland timers.
 * 4. Cloudflare's actual CPU measurement happens at the isolate level, not JS.
 * 5. Promise resolution overhead (chaining, then-callbacks) is attributed to CPU
 *    here but may be negligible in practice.
 *
 * For billing-accurate data, use: Workers Analytics Engine or `ctx.waitUntil`
 * with Cloudflare's native CPU time metric in the dashboard.
 * This utility is best used for *relative* profiling and hot-path discovery,
 * not for predicting exact invoice amounts.
 */

export interface SectionTiming {
  name: string;
  durationMs: number;
  category: "cpu" | "db" | "redis" | "network" | "serialization";
}

export interface ProfileReport {
  totalDurationMs: number;
  estimatedCpuMs: number;
  dbWaitMs: number;
  redisWaitMs: number;
  networkWaitMs: number;
  serializationMs: number;
  sections: SectionTiming[];
}

// ─── Internal state for a single request profile ──────────────────────────────
export class RequestProfiler {
  private readonly startTime: number;
  private sections: SectionTiming[] = [];
  private readonly enabled: boolean;

  constructor() {
    // Zero overhead in production — all methods become no-ops
    this.enabled = process.env.NODE_ENV === "development";
    this.startTime = this.now();
  }

  private now(): number {
    // performance.now() is preferred over Date.now() for sub-ms precision
    // and because it's monotonic (not affected by system clock changes)
    return typeof performance !== "undefined"
      ? performance.now()
      : Date.now();
  }

  /**
   * measureAsyncWait — wraps an async I/O call and records only the waiting time.
   *
   * The key insight: we take a timestamp immediately BEFORE the await and
   * immediately AFTER it resolves. The difference is pure I/O wait — no CPU ran.
   *
   * @example
   *   const result = await profiler.measureAsyncWait("redis:get", "redis", () =>
   *     redis.get(cacheKey)
   *   );
   */
  async measureAsyncWait<T>(
    name: string,
    category: SectionTiming["category"],
    fn: () => Promise<T>
  ): Promise<T> {
    if (!this.enabled) return fn();

    const t0 = this.now();
    const result = await fn();
    const elapsed = this.now() - t0;

    this.sections.push({ name, durationMs: elapsed, category });
    return result;
  }

  /**
   * measureCpuSection — wraps a synchronous or CPU-bound section.
   *
   * Use this for: JSON.stringify, token parsing, data transforms, logic branching.
   * Do NOT nest async awaits inside this — they won't be tracked correctly.
   *
   * @example
   *   const parsed = profiler.measureCpuSection("jwt:verify", () =>
   *     verifyTokenSync(token)
   *   );
   */
  measureCpuSection<T>(name: string, fn: () => T): T {
    if (!this.enabled) return fn();

    const t0 = this.now();
    const result = fn();
    const elapsed = this.now() - t0;

    this.sections.push({ name, durationMs: elapsed, category: "cpu" });
    return result;
  }

  /**
   * trackSection — manually record a pre-measured duration.
   * Useful when start/end timestamps were captured outside this utility.
   *
   * @example
   *   const t0 = performance.now();
   *   // ... some code ...
   *   profiler.trackSection("auth:total", performance.now() - t0, "cpu");
   */
  trackSection(
    name: string,
    durationMs: number,
    category: SectionTiming["category"]
  ): void {
    if (!this.enabled) return;
    this.sections.push({ name, durationMs, category });
  }

  /**
   * finish — compute and emit the full profile report.
   * Call this once, just before returning the Response.
   */
  finish(): ProfileReport | null {
    if (!this.enabled) return null;

    const totalDurationMs = this.now() - this.startTime;

    const sum = (cat: SectionTiming["category"]) =>
      this.sections
        .filter((s) => s.category === cat)
        .reduce((acc, s) => acc + s.durationMs, 0);

    const dbWaitMs = sum("db");
    const redisWaitMs = sum("redis");
    const networkWaitMs = sum("network");
    const serializationMs = sum("serialization");

    const totalTrackedIo = dbWaitMs + redisWaitMs + networkWaitMs;

    /**
     * CPU estimation:
     * We cannot directly measure CPU without isolate-level hooks, so we subtract
     * all tracked I/O from wall time. This gives a *lower bound* on CPU time
     * because untimed gaps (between section calls) are attributed to CPU.
     *
     * Accuracy improves when every I/O call is wrapped with measureAsyncWait().
     */
    const estimatedCpuMs = Math.max(0, totalDurationMs - totalTrackedIo);

    const report: ProfileReport = {
      totalDurationMs: +totalDurationMs.toFixed(2),
      estimatedCpuMs: +estimatedCpuMs.toFixed(2),
      dbWaitMs: +dbWaitMs.toFixed(2),
      redisWaitMs: +redisWaitMs.toFixed(2),
      networkWaitMs: +networkWaitMs.toFixed(2),
      serializationMs: +serializationMs.toFixed(2),
      sections: this.sections.map((s) => ({
        ...s,
        durationMs: +s.durationMs.toFixed(2),
      })),
    };

    this.emit(report);
    return report;
  }

  private emit(report: ProfileReport): void {
    const bar = (ms: number, total: number) => {
      const pct = Math.round((ms / total) * 20);
      return "█".repeat(pct) + "░".repeat(20 - pct);
    };

    const t = report.totalDurationMs;

    console.log(
      [
        "",
        "┌─────────────────────────────────────────────┐",
        "│              [PROFILE REPORT]               │",
        "└─────────────────────────────────────────────┘",
        `  Total Duration    : ${t.toFixed(2).padStart(8)} ms  ${bar(t, t)}`,
        `  Estimated CPU     : ${report.estimatedCpuMs.toFixed(2).padStart(8)} ms  ${bar(report.estimatedCpuMs, t)}`,
        `  DB Wait           : ${report.dbWaitMs.toFixed(2).padStart(8)} ms  ${bar(report.dbWaitMs, t)}`,
        `  Redis Wait        : ${report.redisWaitMs.toFixed(2).padStart(8)} ms  ${bar(report.redisWaitMs, t)}`,
        `  Network Wait      : ${report.networkWaitMs.toFixed(2).padStart(8)} ms  ${bar(report.networkWaitMs, t)}`,
        `  Serialization     : ${report.serializationMs.toFixed(2).padStart(8)} ms  ${bar(report.serializationMs, t)}`,
        "",
        "  ── Per-Section Breakdown ──────────────────",
        ...report.sections.map(
          (s) =>
            `  [${s.category.padEnd(13)}] ${s.name.padEnd(30)} ${s.durationMs.toFixed(2).padStart(7)} ms`
        ),
        "─────────────────────────────────────────────",
        "",
      ].join("\n")
    );
  }
}