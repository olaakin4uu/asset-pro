/**
 * Endpoints that are safe to queue when offline. Everything else fails
 * fast with the usual "network error" — by design. See
 * docs/OFFLINE-FIRST-PLAN.md for why only append-only events are safe.
 *
 * Pattern form: { method, pattern } where pattern is matched against the
 * URL using a RegExp. URLs here are the PATH portion only (no host / no
 * baseURL prefix) — the interceptor strips the base before matching.
 */

export interface OfflineRule {
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  pattern: RegExp;
  /** Human-readable label for the offline banner / inspector. */
  label: string;
  /** Extract a short human context from the request body (e.g. "Flock BR-045"). */
  context?: (body: unknown) => string | undefined;
  /** Extract context from the URL path (useful when body is FormData — voice notes). */
  contextFromUrl?: (urlPath: string) => string | undefined;
  /** Extract flockId from the URL so the inspector can count per-flock queues. */
  flockIdFromUrl?: (urlPath: string) => number | undefined;
  /** Max queueable entries of this kind — guards storage for large bodies (voice notes). */
  maxQueued?: number;
}

const flockContext = (body: unknown): string | undefined => {
  if (body && typeof body === 'object' && 'flockId' in body) {
    const id = (body as { flockId?: unknown }).flockId;
    return id ? `Flock #${id}` : undefined;
  }
  return undefined;
};

// Capture groups in the voice-note pattern give us flockId for the per-flock
// badge and the offline banner label.
const VOICE_NOTE_PATTERN = /^\/livestock\/flock-voice-notes\/flock\/(\d+)$/;
const voiceFlockId = (urlPath: string): number | undefined => {
  const m = urlPath.match(VOICE_NOTE_PATTERN);
  return m ? parseInt(m[1], 10) : undefined;
};

export const OFFLINE_RULES: OfflineRule[] = [
  { method: 'POST', pattern: /^\/livestock\/flock-mortality$/, label: 'Mortality log', context: flockContext },
  { method: 'POST', pattern: /^\/livestock\/flock-feeding$/, label: 'Feed issue', context: flockContext },
  { method: 'POST', pattern: /^\/livestock\/flock-eggs$/, label: 'Egg collection', context: flockContext },
  { method: 'POST', pattern: /^\/livestock\/flock-weights$/, label: 'Weight sample', context: flockContext },
  { method: 'POST', pattern: /^\/livestock\/flock-water$/, label: 'Water intake', context: flockContext },
  { method: 'POST', pattern: /^\/livestock\/flock-environment$/, label: 'Environment reading', context: flockContext },
  { method: 'POST', pattern: /^\/livestock\/flock-brooding$/, label: 'Brooding reading', context: flockContext },
  { method: 'POST', pattern: /^\/livestock\/flock-health-events$/, label: 'Health event', context: flockContext },
  { method: 'PATCH', pattern: /^\/livestock\/flock-vaccinations\/\d+\/administer$/, label: 'Vaccine administered' },
  {
    method: 'POST',
    pattern: VOICE_NOTE_PATTERN,
    label: 'Voice note',
    // Voice blobs run 2-10 MB each. Cap the queue so a rural site doesn't
    // quietly balloon to hundreds of MB in IndexedDB.
    maxQueued: 5,
    contextFromUrl: (url) => {
      const id = voiceFlockId(url);
      return id ? `Flock #${id}` : undefined;
    },
    flockIdFromUrl: voiceFlockId,
  },

  // ==========================================================================
  // Sprint 2 Batch 9 — vet ambulatory write queue. The mobile vet visiting a
  // farm in flaky-network territory should be able to log everything and
  // sync on their way back.
  // ==========================================================================
  {
    method: 'POST',
    pattern: /^\/veterinary\/visits$/,
    label: 'Walk-in visit',
    context: (body) => {
      if (body && typeof body === 'object' && 'animalId' in body) {
        const id = (body as { animalId?: unknown }).animalId;
        return id ? `Animal #${id}` : undefined;
      }
      return undefined;
    },
  },
  {
    method: 'POST',
    pattern: /^\/veterinary\/ambulatory-requests$/,
    label: 'Field visit request',
    context: (body) => {
      if (body && typeof body === 'object' && 'clientId' in body) {
        const id = (body as { clientId?: unknown }).clientId;
        return id ? `Client #${id}` : undefined;
      }
      return undefined;
    },
  },
  {
    method: 'POST',
    pattern: /^\/veterinary\/visits\/\d+\/triage$/,
    label: 'Triage record',
  },
  {
    method: 'POST',
    pattern: /^\/veterinary\/visits\/\d+\/photos$/,
    label: 'Visit photo',
    // Photo blobs ~ 1-3 MB on a phone. Cap queue size.
    maxQueued: 20,
  },
  {
    method: 'POST',
    pattern: /^\/veterinary\/animals\/\d+\/vaccinations$/,
    label: 'Vaccination',
  },
  {
    method: 'POST',
    pattern: /^\/veterinary\/animals\/\d+\/weight-history$/,
    label: 'Weight reading',
  },
];

/**
 * Find the offline rule that matches a given method + URL path.
 * Returns undefined when the request isn't queueable.
 */
export function matchOfflineRule(method: string, urlPath: string): OfflineRule | undefined {
  const m = method.toUpperCase();
  return OFFLINE_RULES.find((r) => r.method === m && r.pattern.test(urlPath));
}
