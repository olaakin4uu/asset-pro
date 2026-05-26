import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, of, switchMap } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { TenantPrismaService } from '../services/tenant-prisma.service';

/**
 * Idempotency interceptor — safe retries for offline-queued writes.
 *
 * Clients (the PWA offline queue, and any future mobile app) generate a
 * UUID per append-only write and send it as `X-Client-Request-Id`. The
 * interceptor:
 *
 *   1. Looks up the key in `_idempotency_keys` (tenant-scoped).
 *   2. On hit — returns the cached response + status code, bypasses the
 *      controller entirely. This is the "we saw this already" path that
 *      prevents duplicates when a flaky network lost the original response.
 *   3. On miss — executes the controller, then caches the response body
 *      + status for the next retry.
 *
 * Only runs for mutating methods on whitelisted URL prefixes. Everything
 * else passes through untouched — the idempotency table stays small and
 * the hot path for most requests is unaffected.
 *
 * See docs/OFFLINE-FIRST-PLAN.md for the full architecture.
 */

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * URL prefixes (relative to the /api/v1 base) where idempotency matters.
 * Kept in lock-step with the frontend offline-queue whitelist at
 * salvagefrontend/src/lib/offline/whitelist.ts. When adding a new
 * append-only event endpoint, update BOTH lists.
 */
const WHITELISTED_PREFIXES = [
  '/livestock/flock-mortality',
  '/livestock/flock-feeding',
  '/livestock/flock-eggs',
  '/livestock/flock-weights',
  '/livestock/flock-water',
  '/livestock/flock-environment',
  '/livestock/flock-brooding',
  '/livestock/flock-health-events',
  '/livestock/flock-vaccinations/', // PATCH /:id/administer
];

function isWhitelisted(url: string): boolean {
  // Strip query string + any version prefix.
  const path = url.split('?')[0].replace(/^\/api\/v\d+/, '');
  return WHITELISTED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

interface IdempotencyRow {
  responseBody: unknown;
  statusCode: number;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const method = (req.method || 'GET').toUpperCase();

    if (!MUTATING_METHODS.has(method)) return next.handle();

    const rawKey = req.header('x-client-request-id');
    const key = typeof rawKey === 'string' ? rawKey.trim() : '';
    if (!key) return next.handle();
    if (!isWhitelisted(req.originalUrl || req.url || '')) return next.handle();

    const reqUser = (req as Request & { user?: { id?: number } }).user;
    const userId = reqUser?.id ?? null;

    // Guard against accidental overflow — table column is VARCHAR(100).
    if (key.length > 100) return next.handle();

    // Step 1: lookup. tenantPrisma has search_path already set by the
    // TenantGuard (which runs before this interceptor).
    return from(this.lookup(key)).pipe(
      switchMap((cached) => {
        if (cached) {
          this.logger.debug(`Idempotency hit for ${method} ${req.url} key=${key.slice(0, 8)}…`);
          // Short-circuit — set the original status on the response and
          // emit the cached body. The response decorator in NestJS will
          // serialise it out.
          const res = ctx.switchToHttp().getResponse();
          res.status(cached.statusCode);
          return of(cached.responseBody);
        }
        // Step 2: miss — run handler, cache on the way out.
        return next.handle().pipe(
          tap((body) => {
            const res = ctx.switchToHttp().getResponse();
            const statusCode = typeof res.statusCode === 'number' ? res.statusCode : 200;
            // Fire-and-forget cache write; don't block the response.
            void this.store(key, userId, method, req.url || '', statusCode, body).catch((err) => {
              this.logger.warn(`Idempotency store failed (${key.slice(0, 8)}…): ${err?.message ?? err}`);
            });
          }),
        );
      }),
    );
  }

  private async lookup(key: string): Promise<IdempotencyRow | null> {
    try {
      const row = await this.tenantPrisma.queryOne<{
        responseBody: unknown;
        statusCode: number;
      }>(
        `SELECT "responseBody", "statusCode" FROM _idempotency_keys WHERE key = $1 LIMIT 1`,
        [key],
      );
      return row ?? null;
    } catch (err) {
      // If the table doesn't exist yet (migration hasn't run on this
      // tenant) or the DB hiccups, don't break the write — just skip
      // idempotency for this request.
      this.logger.debug(`Idempotency lookup skipped: ${(err as Error)?.message}`);
      return null;
    }
  }

  private async store(
    key: string,
    userId: number | null,
    method: string,
    url: string,
    statusCode: number,
    body: unknown,
  ): Promise<void> {
    // Truncate url defensively — table column is VARCHAR(500).
    const safeUrl = url.slice(0, 500);
    await this.tenantPrisma.query(
      `INSERT INTO _idempotency_keys (key, "userId", method, url, "statusCode", "responseBody", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
       ON CONFLICT (key) DO NOTHING`,
      [key, userId, method, safeUrl, statusCode, JSON.stringify(body ?? null)],
    );
  }
}
