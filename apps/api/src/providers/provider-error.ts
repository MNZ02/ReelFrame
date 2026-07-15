/**
 * A provider (fal/Replicate) failure with a clean, user-facing message and a
 * terminal/transient classification. `terminal` means retrying won't help
 * (quota exhausted, bad auth, invalid request) — the pipeline fails the
 * generation immediately and refunds, instead of burning retries. Non-terminal
 * (rate limit, 5xx) is worth retrying.
 */
export class ProviderError extends Error {
  readonly terminal: boolean;
  readonly userMessage: string;
  readonly status?: number;

  constructor(userMessage: string, opts: { terminal: boolean; status?: number; cause?: unknown }) {
    super(userMessage);
    this.name = "ProviderError";
    this.userMessage = userMessage;
    this.terminal = opts.terminal;
    this.status = opts.status;
  }
}

/** Map a provider HTTP error response to a classified, user-facing ProviderError. */
export function classifyProviderHttpError(
  providerLabel: string,
  status: number,
  bodyText: string,
): ProviderError {
  switch (status) {
    case 401:
    case 403:
      return new ProviderError(
        `${providerLabel} authentication failed. Check the provider API key.`,
        { terminal: true, status },
      );
    case 402:
      return new ProviderError(
        `${providerLabel} free usage limit reached. Add billing on ${providerLabel} to keep generating videos.`,
        { terminal: true, status },
      );
    case 400:
    case 422:
      return new ProviderError(
        `${providerLabel} rejected this request — the prompt or settings were invalid.`,
        { terminal: true, status },
      );
    case 404:
      return new ProviderError(`${providerLabel} could not find the requested model.`, {
        terminal: true,
        status,
      });
    case 429:
      return new ProviderError(`${providerLabel} is rate-limiting requests right now.`, {
        terminal: false,
        status,
      });
    default:
      // 5xx: server hiccup, worth retrying (transient). Other unhandled 4xx:
      // a client error that won't change on retry (terminal).
      return new ProviderError(
        `${providerLabel} request failed (HTTP ${status}).`,
        { terminal: status < 500, status, cause: bodyText },
      );
  }
}

/** Seconds to wait after a 429, from the Retry-After header or a `retry_after` body field. */
export function parseRetryAfterSeconds(headers: Headers, bodyText: string): number | undefined {
  const header = headers.get("retry-after");
  if (header && !Number.isNaN(Number(header))) return Number(header);
  try {
    const body = JSON.parse(bodyText) as { retry_after?: number };
    if (typeof body.retry_after === "number") return body.retry_after;
  } catch {
    // body wasn't JSON
  }
  return undefined;
}
