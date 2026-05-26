import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistService } from '../../../common/services/token-blacklist.service';
import { UserTypeEnum } from '../dto';

export interface JwtPayload {
  sub: number | string;
  email: string;
  name?: string;
  role: string;
  tenantId?: string;
  tenantSlug?: string;
  // Unified login fields
  userType?: UserTypeEnum;
  companyId?: number;
  branchId?: number;
  // Entity-specific IDs (only one will be set based on userType)
  employeeId?: number;
  customerId?: number;
  supplierId?: number;
  investorId?: number;
  // UI language preference (en|yo|ha|ig). Livestock pilot 2026-04-24.
  locale?: string;
  type: 'access' | 'refresh';
  jti?: string;
  iat?: number;
  exp?: number;
}

// Validated user object returned by JWT strategy
export interface AuthUser {
  id: number | string;
  email: string;
  role: string;
  tenantId?: string;
  tenantSlug?: string;
  userType?: UserTypeEnum;
  companyId?: number;
  branchId?: number;
  employeeId?: number;
  customerId?: number;
  supplierId?: number;
  investorId?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private tokenBlacklist: TokenBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (() => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET environment variable is required');
        return secret;
      })(),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Check if this specific token has been blacklisted (logout)
    if (payload.jti) {
      const blacklisted = await this.tokenBlacklist.isBlacklisted(payload.jti);
      if (blacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    // Check if all tokens for this user were revoked (user disable/delete)
    if (payload.iat) {
      const revoked = await this.tokenBlacklist.isUserRevoked(payload.sub, payload.iat);
      if (revoked) {
        throw new UnauthorizedException('User session has been revoked');
      }
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
      tenantSlug: payload.tenantSlug,
      userType: payload.userType,
      companyId: payload.companyId,
      branchId: payload.branchId,
      employeeId: payload.employeeId,
      customerId: payload.customerId,
      supplierId: payload.supplierId,
      investorId: payload.investorId,
    };
  }
}
