import { Injectable, Logger } from '@nestjs/common';

/**
 * TokenBlacklistService — in-memory JWT blacklist.
 *
 * Stores blacklisted token JTIs in a Map with TTL-based expiry.
 * Tokens auto-expire when their TTL passes. Periodically sweeps stale entries.
 *
 * For production deployments with multiple instances, replace with a Redis
 * backed implementation by adding ioredis and updating this service.
 */
@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly blacklisted = new Map<string, number>(); // jti → expiry timestamp (ms)
  private readonly userRevocations = new Map<string, number>(); // userId → revoked-at (ms)

  constructor() {
    // Sweep stale entries every 10 minutes
    setInterval(() => this.sweep(), 10 * 60 * 1000);
  }

  async blacklist(tokenId: string, expiresInSeconds: number): Promise<void> {
    this.blacklisted.set(tokenId, Date.now() + Math.max(expiresInSeconds, 1) * 1000);
  }

  async isBlacklisted(tokenId: string): Promise<boolean> {
    const expiry = this.blacklisted.get(tokenId);
    if (!expiry) return false;
    if (Date.now() > expiry) {
      this.blacklisted.delete(tokenId);
      return false;
    }
    return true;
  }

  async revokeAllForUser(userId: string | number, maxTokenLifetimeSeconds = 604800): Promise<void> {
    this.userRevocations.set(String(userId), Date.now());
    // Auto-clean after max token lifetime
    setTimeout(() => this.userRevocations.delete(String(userId)), maxTokenLifetimeSeconds * 1000);
  }

  async isUserRevoked(userId: string | number, tokenIssuedAt: number): Promise<boolean> {
    const revokedAt = this.userRevocations.get(String(userId));
    if (!revokedAt) return false;
    return tokenIssuedAt * 1000 < revokedAt;
  }

  private sweep(): void {
    const now = Date.now();
    for (const [jti, expiry] of this.blacklisted) {
      if (now > expiry) this.blacklisted.delete(jti);
    }
    this.logger.debug(`Token blacklist sweep: ${this.blacklisted.size} active entries`);
  }
}
