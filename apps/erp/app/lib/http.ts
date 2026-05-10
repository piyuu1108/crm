const DEFAULT_REQUEST_TIMEOUT_MS = 8000;

interface FetchWithTimeoutInit extends RequestInit {
  timeoutMs?: number;
  timeoutMessage?: string;
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: FetchWithTimeoutInit = {}
) {
  const {
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    timeoutMessage = `Request timed out after ${timeoutMs}ms`,
    signal,
    ...rest
  } = init;

  const controller = new AbortController();
  const abortFromSignal = () => controller.abort();

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", abortFromSignal, { once: true });
    }
  }

  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...rest,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(timeoutMessage);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener("abort", abortFromSignal);
    }
  }
}
