import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { ContextIdFactory, ModuleRef, Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AuditService } from '../services/audit.service';
import { SKIP_AUDIT_KEY, AUDIT_RESOURCE_KEY } from '../decorators/audit.decorators';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const METHOD_TO_EVENT: Record<string, 'created' | 'updated' | 'deleted'> = {
  POST: 'created',
  PUT: 'updated',
  PATCH: 'updated',
  DELETE: 'deleted',
};

const SENSITIVE_FIELDS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'passwordConfirmation',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'clientSecret',
  'pin',
  'otp',
  'totp',
  'mfaCode',
]);

const SKIP_PATH_PATTERNS = [
  /^\/?auth\//i,
  /^\/?registration/i,
  /^\/?central-admin\/auth/i,
  /^\/?sync\//i,
  /^\/?core\/audit-logs/i,
  /^\/?health/i,
  /^\/?upload/i,
];

/**
 * Global audit interceptor - logs every authenticated mutating request.
 *
 * Singleton-scoped. AuditService is request-scoped (transitively via
 * TenantPrismaService) and is resolved per-request via ModuleRef to
 * avoid scope cascade breaking Reflector injection.
 *
 * Opt-out with @SkipAudit() on controllers or handlers.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request & { user?: any }>();
    const method = request.method?.toUpperCase();

    if (!MUTATING_METHODS.has(method)) {
      return next.handle();
    }

    const skipHandler = this.reflector?.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipHandler) {
      return next.handle();
    }

    const normalizedPath = this.normalizePath(request.originalUrl || request.url || '');
    if (this.isSkippedPath(normalizedPath)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((responseBody) => {
        this.writeAudit(context, request, normalizedPath, responseBody).catch((err) => {
          this.logger.warn(`Audit write suppressed: ${err?.message || err}`);
        });
      }),
    );
  }

  private async writeAudit(
    context: ExecutionContext,
    request: Request & { user?: any },
    normalizedPath: string,
    responseBody: any,
  ): Promise<void> {
    const user = request.user;
    if (!user?.id || !user?.tenantSlug) {
      return;
    }

    const userId = Number(user.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      return;
    }

    const method = request.method.toUpperCase();
    const event = METHOD_TO_EVENT[method];
    if (!event) return;

    const resourceOverride = this.reflector?.getAllAndOverride<string>(AUDIT_RESOURCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const auditableType = resourceOverride || this.deriveAuditableType(normalizedPath);
    const auditableId = this.resolveEntityId(request, responseBody, method);

    const newValues = event === 'deleted' ? null : this.sanitizeBody(request.body);

    const handler = context.getHandler()?.name;
    const controller = context.getClass()?.name;
    const tags = [controller, handler].filter(Boolean).join('::') || undefined;

    const auditService = await this.resolveAuditService(request);
    if (!auditService) return;

    await auditService.log({
      userId,
      event,
      auditableType,
      auditableId,
      oldValues: null,
      newValues,
      url: normalizedPath,
      ipAddress: this.resolveIp(request),
      userAgent: request.headers?.['user-agent'] as string | undefined,
      tags,
    });
  }

  /**
   * Resolve request-scoped AuditService via the request's context id.
   * This pairs the service instance with the same TenantPrismaService
   * that the rest of the request is using (same tenant schema).
   */
  private async resolveAuditService(request: Request): Promise<AuditService | null> {
    try {
      const contextId = ContextIdFactory.getByRequest(request);
      return await this.moduleRef.resolve(AuditService, contextId, { strict: false });
    } catch (err) {
      this.logger.warn(`Could not resolve AuditService: ${(err as Error)?.message}`);
      return null;
    }
  }

  private normalizePath(url: string): string {
    const [pathname] = url.split('?');
    return pathname.replace(/^\/api\/v1/i, '') || '/';
  }

  private isSkippedPath(path: string): boolean {
    return SKIP_PATH_PATTERNS.some((pattern) => pattern.test(path));
  }

  private deriveAuditableType(path: string): string {
    const segments = path
      .split('/')
      .filter(Boolean)
      .filter((seg) => !/^\d+$/.test(seg) && !/^[0-9a-f-]{32,}$/i.test(seg));

    if (segments.length === 0) return 'unknown';
    if (segments.length === 1) return segments[0];

    return `${segments[0]}.${segments[1]}`;
  }

  private resolveEntityId(
    request: Request,
    responseBody: any,
    method: string,
  ): number {
    const paramId = (request.params as Record<string, string>)?.id;
    if (paramId) {
      const parsed = Number(paramId);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }

    if (method === 'POST') {
      const id = this.extractIdFromResponse(responseBody);
      if (id) return id;
    }

    return 0;
  }

  private extractIdFromResponse(body: any): number | null {
    if (!body || typeof body !== 'object') return null;

    const candidates = [body.id, body?.data?.id, body?.result?.id];
    for (const candidate of candidates) {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return null;
  }

  private sanitizeBody(body: any): Record<string, any> | null {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return body && typeof body === 'object' ? { value: body } : null;
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(body)) {
      if (SENSITIVE_FIELDS.has(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        sanitized[key] = this.sanitizeBody(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private resolveIp(request: Request): string | undefined {
    const forwarded = request.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.socket?.remoteAddress;
  }
}
