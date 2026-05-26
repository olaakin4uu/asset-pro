import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * TokenBlacklistService — Redis-backed JWT blacklist.
 *
 * When a user logs out (or is disabled), the current access token's JTI
 * is stored in Redis with a TTL equal to the token's remaining lifetime.
 * The JWT strategy checks the blacklist before accepting any token.
 */
@Injectable()
export class TokenBlacklistService implements OnModuleDestroy {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private redis: Redis;

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    const sharedOptions = {
      keyPrefix: 'token_blacklist:',
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      retryStrategy: (times: number) => Math.min(times * 500, 30000),
      enableReadyCheck: false,
    };

    if (redisUrl) {
      this.redis = new Redis(redisUrl, sharedOptions);
    } else {
      const host = this.configService.get<string>('REDIS_HOST', 'localhost');
      const port = this.configService.get<number>('REDIS_PORT', 6379);
      const password = this.configService.get<string>('REDIS_PASSWORD');
      const tls = this.configService.get<string>('REDIS_TLS') === 'true';
      this.redis = new Redis({
        host,
        port,
        ...(password ? { password } : {}),
        ...(tls ? { tls: {} } : {}),
        ...sharedOptions,
      });
    }

    // Prevent unhandled error events from crashing the process
    this.redis.on('error', (err) => {
      this.logger.warn(`Redis error (token blacklist unavailable): ${err.message}`);
    });

    this.redis.connect().catch((err) => {
      this.logger.warn(`Redis connection failed (token blacklist will be unavailable): ${err.message}`);
    });
  }

  onModuleDestroy() {
    this.redis?.disconnect();
  }

  /**
   * Add a token to the blacklist.
   * @param tokenId - Unique identifier for the token (jti or hashed token)
   * @param expiresInSeconds - TTL so the key auto-expires when the token would have expired
   */
  async blacklist(tokenId: string, expiresInSeconds: number): Promise<void> {
    try {
      await this.redis.set(tokenId, '1', 'EX', Math.max(expiresInSeconds, 1));
    } catch (err) {
      this.logger.error(`Failed to blacklist token: ${err.message}`);
    }
  }

  /**
   * Check whether a token is blacklisted.
   */
  async isBlacklisted(tokenId: string): Promise<boolean> {
    // ioredis queues commands while reconnecting and only rejects after the
    // retryStrategy gives up (up to 30 s). Check the connection status first
    // so we never enqueue a command against a down Redis — fail-open instantly.
    if (this.redis.status !== 'ready') {
      return false;
    }
    try {
      const result = await this.redis.exists(tokenId);
      return result === 1;
    } catch (err) {
      this.logger.error(`Failed to check blacklist: ${err.message}`);
      // Fail-open: allow access when Redis is unavailable.
      // Blocking ALL users is far worse than theoretical token reuse risk.
      // JWT signature validation + expiry checks still protect against forgery.
      this.logger.warn('Token blacklist unavailable — allowing access (fail-open)');
      return false;
    }
  }

  /**
   * Blacklist all tokens for a given user by storing a "revoked-before" timestamp.
   * Any token issued before this timestamp is considered invalid.
   */
  async revokeAllForUser(userId: string | number, maxTokenLifetimeSeconds = 604800): Promise<void> {
    try {
      const key = `user_revoke:${userId}`;
      await this.redis.set(key, Date.now().toString(), 'EX', maxTokenLifetimeSeconds);
    } catch (err) {
      this.logger.error(`Failed to revoke tokens for user ${userId}: ${err.message}`);
    }
  }

  /**
   * Check if a token was issued before the user's revocation timestamp.
   */
  async isUserRevoked(userId: string | number, tokenIssuedAt: number): Promise<boolean> {
    if (this.redis.status !== 'ready') {
      return false;
    }
    try {
      const key = `user_revoke:${userId}`;
      const revokedAt = await this.redis.get(key);
      if (!revokedAt) return false;
      // Token iat is in seconds, revokedAt is in ms
      return tokenIssuedAt * 1000 < parseInt(revokedAt, 10);
    } catch (err) {
      this.logger.error(`Failed to check user revocation: ${err.message}`);
      return false;
    }
  }
}
