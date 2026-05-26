/**
 * Offline write queue — IndexedDB-backed store for requests that need to
 * survive network outages.
 *
 * See docs/OFFLINE-FIRST-PLAN.md for the full architecture.
 *
 * Only append-only event endpoints are safe to queue (mortality, feed,
 * eggs, weights, water, vaccine-administer, environment, brooding,
 * health-events — see whitelist.ts). Everything else — approvals, status
 * changes, GL — stays online-only.
 */

import { openDB, type IDBPDatabase } from "idb";
import axios from "axios";

const DB_NAME = "salvage-offline";
const DB_VERSION = 1;
const STORE = "pending-writes";

export type QueueEntryStatus = "pending" | "syncing" | "failed";

/**
 * Serialised multipart body. IndexedDB stores Blob instances natively
 * (structured clone) so we keep the audio/video blob intact and reconstruct
 * FormData on replay. `fields` preserves insertion order.
 */
export interface MultipartBody {
  __multipart: true;
  fields: Array<
    | { name: string; value: string }
    | { name: string; value: Blob; fileName?: string }
  >;
}

export interface QueueEntry {
  /** Client-generated UUID. Sent as X-Client-Request-Id so the server can dedupe on replay. */
  id: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  /** Path only (no host, no baseURL). Replay re-prepends the current baseURL. */
  url: string;
  /** JSON body OR serialised multipart ({ __multipart: true, fields: [...] }). */
  body: unknown;
  /** Endpoint category — currently always 'livestock-event'. Room to grow. */
  kind: string;
  /** Epoch ms when the write was attempted. */
  createdAt: number;
  /** Number of sync attempts. */
  tries: number;
  /** Last error message if a sync attempt failed. */
  lastError?: string;
  status: QueueEntryStatus;
  /** Human-readable summary for the UI (e.g. "Mortality log — Flock BR-045"). */
  label?: string;
  /** Epoch ms after which this entry is eligible for a retry (exponential backoff). */
  nextAttemptAt?: number;
  /** Authorization header at enqueue time — the token can rotate before we replay. */
  authHeader?: string;
  /** Denormalised flockId for the per-flock pending badge (FormData bodies can't be introspected). */
  flockId?: number;
}

/** Type guard for a multipart body. */
export function isMultipartBody(body: unknown): body is MultipartBody {
  return !!body && typeof body === "object" && (body as MultipartBody).__multipart === true;
}

/**
 * Walk a FormData instance and copy it into a plain object suitable for
 * IndexedDB. Blobs (audio, images) pass through unchanged thanks to
 * structured clone; strings stay strings.
 */
export async function serializeFormData(fd: FormData): Promise<MultipartBody> {
  const fields: MultipartBody["fields"] = [];
  fd.forEach((value, name) => {
    if (value instanceof Blob) {
      // File preserves `name`; generic Blob does not — fall back to name.
      const fileName = (value as File).name ?? `${name}.bin`;
      fields.push({ name, value, fileName });
    } else {
      fields.push({ name, value: String(value) });
    }
  });
  return { __multipart: true, fields };
}

/** Rebuild a FormData from its serialised form for replay. */
export function deserializeFormData(body: MultipartBody): FormData {
  const fd = new FormData();
  for (const field of body.fields) {
    const { name, value } = field;
    if (value instanceof Blob) {
      // Only the Blob variant has fileName — narrow via cast.
      const fileName = (field as { fileName?: string }).fileName;
      fd.append(name, value, fileName);
    } else {
      fd.append(name, value);
    }
  }
  return fd;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB not available (SSR or unsupported browser)"));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("by-status", "status");
          store.createIndex("by-createdAt", "createdAt");
        }
      },
    });
  }
  return dbPromise;
}

/** Enqueue a write. Called by the axios response interceptor on network failure. */
export async function enqueue(entry: Omit<QueueEntry, "createdAt" | "tries" | "status">): Promise<void> {
  const db = await getDb();
  const full: QueueEntry = { ...entry, createdAt: Date.now(), tries: 0, status: "pending" };
  await db.put(STORE, full);
}

/** Count of entries currently waiting to sync. Powers the banner badge. */
export async function pendingCount(): Promise<number> {
  try {
    const db = await getDb();
    const pending = await db.countFromIndex(STORE, "by-status", "pending");
    const syncing = await db.countFromIndex(STORE, "by-status", "syncing");
    return pending + syncing;
  } catch {
    return 0;
  }
}

/** Return all entries, newest first. For the pending-writes inspector UI (week 3). */
export async function list(): Promise<QueueEntry[]> {
  try {
    const db = await getDb();
    const all = await db.getAll(STORE);
    return all.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

/** Remove a completed or discarded entry. */
export async function remove(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}

/**
 * Reset an entry back to pending so the next replay picks it up. Used by
 * the inspector's "Retry" button on failed entries. Resets the backoff
 * clock and clears lastError.
 */
export async function retry(id: string): Promise<void> {
  await update(id, { status: "pending", tries: 0, lastError: undefined, nextAttemptAt: undefined });
}

/** Count of entries in the `failed` terminal state. Powers the red badge. */
export async function failedCount(): Promise<number> {
  try {
    const db = await getDb();
    return await db.countFromIndex(STORE, "by-status", "failed");
  } catch {
    return 0;
  }
}

/** Count of entries referencing a specific flock. Powers per-flock badges. */
export async function pendingCountForFlock(flockId: number): Promise<number> {
  try {
    const all = await list();
    return all.filter((e) => {
      if (e.status === "failed") return false;
      // Explicit denorm field wins — set for multipart uploads where we
      // can't introspect the body.
      if (e.flockId === flockId) return true;
      // JSON body: look for flockId inside.
      if (typeof e.body === "object" && e.body !== null) {
        return (e.body as { flockId?: number }).flockId === flockId;
      }
      return false;
    }).length;
  } catch {
    return 0;
  }
}

/**
 * Unregister the service worker. Escape hatch when the SW cache gets into
 * a bad state (e.g. a broken deploy served stale assets). Users access this
 * via the inspector's "Reset offline cache" button.
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    return true;
  } catch {
    return false;
  }
}

/** Update an entry (status / tries / lastError). Used by the replay loop. */
export async function update(id: string, patch: Partial<QueueEntry>): Promise<void> {
  const db = await getDb();
  const existing = await db.get(STORE, id);
  if (!existing) return;
  await db.put(STORE, { ...existing, ...patch });
}

/** Max retry count before we mark an entry permanently failed. */
const MAX_TRIES = 10;

/** Max backoff in ms (cap at 2 minutes). */
const MAX_BACKOFF_MS = 120_000;

/**
 * Replay pending writes against the network. Iterates in FIFO order (oldest
 * first) so causally-ordered events stay ordered. Each write is reissued
 * with its original `X-Client-Request-Id` header so the server can dedupe
 * if the original request actually reached it before the network dropped.
 *
 * Stops early on the first network error (no point hammering a dead link).
 * Validation errors (4xx) mark the entry as failed and continue. Success
 * removes the entry.
 */
export async function replay(): Promise<{ synced: number; failed: number; remaining: number }> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { synced: 0, failed: 0, remaining: 0 };
  }

  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005/api/v1';
  const now = Date.now();
  const all = await list();
  // Oldest first, skip entries whose backoff hasn't elapsed.
  const queue = all
    .filter((e) => e.status !== "failed")
    .filter((e) => !e.nextAttemptAt || e.nextAttemptAt <= now)
    .sort((a, b) => a.createdAt - b.createdAt);

  let synced = 0;
  let failed = 0;

  for (const entry of queue) {
    await update(entry.id, { status: "syncing" });
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      const multipart = isMultipartBody(entry.body);
      // Multipart: rebuild FormData; let the browser set the Content-Type
      // header (with the boundary) by not specifying it. JSON: serialize
      // normally.
      const data: unknown = multipart
        ? deserializeFormData(entry.body as MultipartBody)
        : entry.body;
      const headers: Record<string, string> = {
        "X-Client-Request-Id": entry.id,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      if (!multipart) headers["Content-Type"] = "application/json";
      await axios.request({
        url: entry.url,
        method: entry.method,
        baseURL,
        data,
        headers,
        // We own the retry loop; don't let axios throw on non-2xx without
        // us seeing the status code.
        validateStatus: () => true,
        timeout: 60_000, // Large enough for multi-MB voice note uploads.
      }).then(async (resp) => {
        if (resp.status >= 200 && resp.status < 300) {
          await remove(entry.id);
          synced++;
        } else if (resp.status >= 400 && resp.status < 500 && resp.status !== 408 && resp.status !== 429) {
          // Validation / permission / not-found — don't retry, these
          // won't get better by being resent. Mark failed so the user
          // sees them in the inspector.
          await update(entry.id, {
            status: "failed",
            tries: entry.tries + 1,
            lastError: `${resp.status} ${resp.statusText || ''}: ${typeof resp.data === 'object' ? JSON.stringify(resp.data).slice(0, 200) : String(resp.data).slice(0, 200)}`,
          });
          failed++;
        } else {
          // 5xx, 408, 429 → retryable. Exponential backoff.
          const tries = entry.tries + 1;
          if (tries >= MAX_TRIES) {
            await update(entry.id, { status: "failed", tries, lastError: `Gave up after ${tries} tries (${resp.status})` });
            failed++;
          } else {
            const backoff = Math.min(MAX_BACKOFF_MS, 1000 * Math.pow(2, tries));
            await update(entry.id, {
              status: "pending",
              tries,
              nextAttemptAt: Date.now() + backoff,
              lastError: `Server ${resp.status}, retrying in ${Math.round(backoff / 1000)}s`,
            });
          }
        }
      });
    } catch (err) {
      // Network error — no response at all. Back off and stop replaying
      // the rest this cycle; we'll try again when we next come online.
      const tries = entry.tries + 1;
      const message = err instanceof Error ? err.message : "Network error";
      if (tries >= MAX_TRIES) {
        await update(entry.id, { status: "failed", tries, lastError: `Gave up after ${tries} tries: ${message}` });
        failed++;
      } else {
        const backoff = Math.min(MAX_BACKOFF_MS, 1000 * Math.pow(2, tries));
        await update(entry.id, {
          status: "pending",
          tries,
          nextAttemptAt: Date.now() + backoff,
          lastError: `${message} — retrying in ${Math.round(backoff / 1000)}s`,
        });
      }
      break;
    }
  }

  const remaining = await pendingCount();
  return { synced, failed, remaining };
}
