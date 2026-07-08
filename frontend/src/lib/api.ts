function getDefaultApiBase(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:8000";
}
// API_BASE: inlined at build time from NEXT_PUBLIC_API_URL env var
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || getDefaultApiBase();

let _apiBasePromise: Promise<string> | null = null;

export async function getApiBase(): Promise<string> {
  if (_apiBasePromise) return _apiBasePromise;

  _apiBasePromise = (async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      if (data.API_BASE) return data.API_BASE;
    } catch {
      // fall through to default
    }
    return getDefaultApiBase();
  })();

  return _apiBasePromise;
}

// --- Token helpers (localStorage-based, works cross-origin) ---
const TOKEN_KEY = "agrishield_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
    document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
  }
}

export function removeToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    document.cookie = "token=; path=/; max-age=0";
  }
}

/**
 * Wrapper around fetch that auto-attaches the Bearer token header.
 * Drop-in replacement for `fetch(url, { credentials: "include", ... })`.
 */
export async function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(opts.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(url, { ...opts, headers });
}

export function getErrorMessage(err: any, fallback: string = "An unexpected error occurred"): string {
  if (!err) return fallback;

  // If it's already a string, return it
  if (typeof err === "string") return err;

  // If it's an Error instance or object with a message property that is not "[object Object]"
  if (err instanceof Error || (typeof err === "object" && typeof err.message === "string")) {
    if (err.message && err.message !== "[object Object]" && err.message !== "Error") {
      return err.message;
    }
  }

  // Check detail property (common in FastAPI / Pydantic responses)
  if (err.detail !== undefined && err.detail !== null) {
    if (typeof err.detail === "string") {
      return err.detail;
    }
    if (Array.isArray(err.detail)) {
      const messages = err.detail.map((item: any) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          let msg = item.msg || item.message || JSON.stringify(item);
          if (typeof msg === "string") {
            // Clean up "Value error, " prefix from pydantic
            msg = msg.replace(/^Value error,\s*/i, "");
            // Include field name if available from loc
            if (Array.isArray(item.loc) && item.loc.length > 1) {
              const field = item.loc[item.loc.length - 1];
              if (field && typeof field === "string" && field !== "body") {
                return `${field.charAt(0).toUpperCase() + field.slice(1)}: ${msg}`;
              }
            }
          }
          return msg;
        }
        return String(item);
      });
      if (messages.length > 0) {
        return messages.join(", ");
      }
    }
    if (typeof err.detail === "object") {
      return err.detail.message || err.detail.msg || JSON.stringify(err.detail);
    }
  }

  // Check error property (common in rate limit / middleware errors)
  if (err.error !== undefined && err.error !== null) {
    if (typeof err.error === "string") return err.error;
    if (typeof err.error === "object") {
      return err.error.message || err.error.msg || JSON.stringify(err.error);
    }
  }

  // Fallback to message or fallback string
  return fallback;
}

