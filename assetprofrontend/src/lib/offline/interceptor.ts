/**
 * Offline-aware axios interceptors — wire into the authenticated `api`
 * instance. Two jobs:
 *
 *   1. REQUEST SIDE: stamp X-Client-Request-Id on every whitelisted write.
 *      Enables server-side idempotency: if a request reaches the server but
 *      the response is lost (flaky network), a later retry with the same
 *      header returns the cached response instead of creating a duplicate.
 *
 *   2. RESPONSE SIDE: on network failure for a whitelisted write, enqueue
 *      to IndexedDB and resolve with a synthetic 202-ish response so the
 *      caller flow (form saves, flash message, navigate back) completes
 *      normally. The real sync happens later via queue.replay().
 *
 * Non-whitelisted requests are untouched — they fail with the usual
 * network error, same as before.
 */

import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { enqueue, list, serializeFormData, type MultipartBody } from "./queue";
import { matchOfflineRule } from "./whitelist";

/** Generate a UUID (crypto.randomUUID where available, fallback otherwise). */
function newRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers — Math.random is fine, this is a dedup key
  // not a secret.
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Normalise a request's URL path (strip baseURL/host/query for whitelist matching). */
function requestPath(config: AxiosRequestConfig): string {
  const raw = config.url ?? "";
  // Strip host if present.
  const withoutHost = raw.replace(/^https?:\/\/[^/]+/, "");
  // Strip query string.
  const withoutQuery = withoutHost.split("?")[0];
  // Strip the api version prefix (our baseURL includes /api/v1).
  return withoutQuery.replace(/^\/api\/v\d+/, "");
}

export function installOfflineInterceptors(api: AxiosInstance): void {
  // ── REQUEST INTERCEPTOR ─────────────────────────────────────────────
  api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const method = (config.method ?? "GET").toUpperCase();
    const path = requestPath(config);
    const rule = matchOfflineRule(method, path);

    if (rule) {
      // Only set if the caller hasn't already set one (replay re-uses the
      // original id stored on the queue entry).
      config.headers = config.headers ?? {};
      if (!config.headers["X-Client-Request-Id"]) {
        config.headers["X-Client-Request-Id"] = newRequestId();
      }
    }
    return config;
  });

  // ── RESPONSE INTERCEPTOR ────────────────────────────────────────────
  api.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      // Only intercept when:
      //   (a) there's no response (network error, not a server 4xx/5xx)
      //   (b) the browser reports offline OR the error code is ENETUNREACH-ish
      //   (c) the request is a whitelisted write
      if (!error || typeof error !== "object") return Promise.reject(error);

      const err = error as {
        config?: InternalAxiosRequestConfig;
        response?: AxiosResponse;
        code?: string;
        message?: string;
      };
      const config = err.config;
      if (!config || err.response) return Promise.reject(error);

      const method = (config.method ?? "GET").toUpperCase() as "POST" | "PATCH" | "PUT" | "DELETE" | "GET";
      if (method === "GET") return Promise.reject(error);

      const path = requestPath(config);
      const rule = matchOfflineRule(method, path);
      if (!rule) return Promise.reject(error);

      // Looks like we're offline AND this is something we can queue.
      const isOffline =
        (typeof navigator !== "undefined" && !navigator.onLine) ||
        err.code === "ERR_NETWORK" ||
        err.message === "Network Error";
      if (!isOffline) return Promise.reject(error);

      // Pull the client request id set by our own request interceptor.
      const rid =
        (config.headers?.["X-Client-Request-Id"] as string | undefined) ?? newRequestId();

      // Build the label: "Mortality log — Flock #45" etc. Fall back to
      // URL-derived context when the body is FormData (voice notes) and
      // can't be introspected.
      const ctx = rule.context?.(config.data) ?? rule.contextFromUrl?.(path);
      const label = ctx ? `${rule.label} — ${ctx}` : rule.label;

      // Enforce per-rule queue caps (voice notes cap at 5 to guard
      // IndexedDB quota). If we're at cap, fail fast with the original
      // network error rather than silently dropping.
      if (rule.maxQueued && typeof rule.maxQueued === "number") {
        const existing = await list();
        const sameKind = existing.filter(
          (e) => e.status !== "failed" && e.url === path && e.method === method,
        ).length;
        if (sameKind >= rule.maxQueued) {
          return Promise.reject(error);
        }
      }

      // Serialise FormData bodies for IndexedDB (Blobs pass through via
      // structured clone; we reconstruct FormData on replay).
      let bodyForQueue: unknown = config.data;
      if (typeof FormData !== "undefined" && config.data instanceof FormData) {
        bodyForQueue = (await serializeFormData(config.data)) as MultipartBody;
      }

      await enqueue({
        id: rid,
        method: method as QueueEntry["method"],
        url: path,
        body: bodyForQueue,
        kind: "livestock-event",
        label,
        flockId: rule.flockIdFromUrl?.(path),
      });

      // Synthetic response so the caller's `.then` flow runs normally.
      // Status 202 = Accepted (queued for later). `data.__offlineQueued`
      // lets UI code detect a queued write and show a subtle hint if it
      // wants to; by default nothing changes — form closes, flash shows,
      // user moves on.
      const synthetic: AxiosResponse = {
        data: { __offlineQueued: true, __clientRequestId: rid, ...((config.data as object) ?? {}) },
        status: 202,
        statusText: "Accepted (queued for sync)",
        headers: {},
        config,
      };
      return synthetic;
    },
  );
}

// Re-exported here so callers don't have to import from two files.
import type { QueueEntry } from "./queue";
