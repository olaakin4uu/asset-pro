import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { brand } from '../../../common/config/brand';
import {
  UpdateProfileDto,
  SettingsChangePasswordDto,
  Confirm2faDto,
  Disable2faDto,
  UpdateAppearanceDto,
  SettingsProfileResponseDto,
  TwoFactorSetupResponseDto,
  TwoFactorStatusDto,
} from '../dto/user-settings.dto';

@Injectable()
export class UserSettingsService {
  private readonly logger = new Logger(UserSettingsService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  // ============================================================================
  // GET PROFILE
  // ============================================================================

  async getProfile(userId: number): Promise<SettingsProfileResponseDto> {
    const user = await this.tenantPrisma.queryOne<any>(
      `SELECT u.id, u.name, u.email, u."companyId", u."branchId", u."userType",
              u."themePreference", COALESCE(u.locale, 'en') as locale, u."signaturePath",
              u."twoFactorConfirmedAt", u."createdAt",
              c.name as "companyName",
              b.name as "branchName"
       FROM users u
       LEFT JOIN companies c ON u."companyId" = c.id
       LEFT JOIN branches b ON u."branchId" = b.id
       WHERE u.id = $1 AND u."deletedAt" IS NULL`,
      [userId],
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      companyId: user.companyId,
      companyName: user.companyName,
      branchId: user.branchId,
      branchName: user.branchName,
      userType: user.userType,
      themePreference: user.themePreference,
      locale: user.locale,
      signaturePath: user.signaturePath,
      twoFactorEnabled: !!user.twoFactorConfirmedAt,
      twoFactorConfirmedAt: user.twoFactorConfirmedAt,
      createdAt: user.createdAt,
    };
  }

  // ============================================================================
  // UPDATE PROFILE
  // ============================================================================

  async updateProfile(userId: number, dto: UpdateProfileDto): Promise<SettingsProfileResponseDto> {
    // Check email uniqueness if being changed
    if (dto.email) {
      const existing = await this.tenantPrisma.queryOne(
        `SELECT id FROM users WHERE email = $1 AND id != $2 AND "deletedAt" IS NULL`,
        [dto.email, userId],
      );
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.locale !== undefined) {
      // Guardrail: only accept languages we actually ship translations for.
      const allowed = new Set(['en', 'yo', 'ha', 'ig']);
      if (!allowed.has(dto.locale)) {
        throw new BadRequestException(`Unsupported locale "${dto.locale}". Allowed: ${Array.from(allowed).join(', ')}`);
      }
      updateData.locale = dto.locale;
    }

    if (Object.keys(updateData).length > 0) {
      await this.tenantPrisma.update('users', userId, updateData);
    }

    return this.getProfile(userId);
  }

  // ============================================================================
  // CHANGE PASSWORD
  // ============================================================================

  async changePassword(userId: number, dto: SettingsChangePasswordDto): Promise<{ message: string }> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password and confirmation do not match');
    }

    const user = await this.tenantPrisma.queryOne<any>(
      `SELECT id, password FROM users WHERE id = $1 AND "deletedAt" IS NULL`,
      [userId],
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isCurrentValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.tenantPrisma.update('users', userId, { password: newHash });

    return { message: 'Password changed successfully' };
  }

  // ============================================================================
  // SIGNATURE UPLOAD
  // ============================================================================

  async uploadSignature(userId: number, filePath: string): Promise<{ signaturePath: string }> {
    await this.tenantPrisma.update('users', userId, { signaturePath: filePath });
    return { signaturePath: filePath };
  }

  async removeSignature(userId: number): Promise<{ message: string }> {
    await this.tenantPrisma.update('users', userId, { signaturePath: null });
    return { message: 'Signature removed successfully' };
  }

  // ============================================================================
  // TWO-FACTOR AUTHENTICATION
  // ============================================================================

  async enable2fa(userId: number): Promise<TwoFactorSetupResponseDto> {
    const user = await this.tenantPrisma.queryOne<any>(
      `SELECT id, email, "twoFactorConfirmedAt" FROM users WHERE id = $1 AND "deletedAt" IS NULL`,
      [userId],
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.twoFactorConfirmedAt) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    // Generate a base32 secret (compatible with authenticator apps)
    const secretBytes = crypto.randomBytes(20);
    const secret = this.encodeBase32(secretBytes);

    // Generate recovery codes
    const recoveryCodes = this.generateRecoveryCodes();

    // Store secret and recovery codes (not yet confirmed)
    await this.tenantPrisma.update('users', userId, {
      twoFactorSecret: secret,
      twoFactorRecoveryCodes: JSON.stringify(recoveryCodes),
    });

    // Build otpauth URL
    const issuer = encodeURIComponent(brand.totpIssuer);
    const otpauthUrl = `otpauth://totp/${issuer}:${user.email}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    return {
      secret,
      otpauthUrl,
      recoveryCodes,
    };
  }

  async confirm2fa(userId: number, dto: Confirm2faDto): Promise<{ message: string }> {
    const user = await this.tenantPrisma.queryOne<any>(
      `SELECT id, "twoFactorSecret", "twoFactorConfirmedAt" FROM users WHERE id = $1 AND "deletedAt" IS NULL`,
      [userId],
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.twoFactorConfirmedAt) {
      throw new BadRequestException('Two-factor authentication is already confirmed');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication has not been initialized. Call enable first.');
    }

    // Verify the TOTP code
    const isValid = this.verifyTotp(user.twoFactorSecret, dto.code);
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.tenantPrisma.update('users', userId, {
      twoFactorConfirmedAt: new Date(),
    });

    return { message: 'Two-factor authentication confirmed and enabled' };
  }

  async disable2fa(userId: number, dto: Disable2faDto): Promise<{ message: string }> {
    const user = await this.tenantPrisma.queryOne<any>(
      `SELECT id, password, "twoFactorConfirmedAt" FROM users WHERE id = $1 AND "deletedAt" IS NULL`,
      [userId],
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorConfirmedAt) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Password is incorrect');
    }

    await this.tenantPrisma.update('users', userId, {
      twoFactorSecret: null,
      twoFactorRecoveryCodes: null,
      twoFactorConfirmedAt: null,
    });

    return { message: 'Two-factor authentication disabled' };
  }

  async get2faStatus(userId: number): Promise<TwoFactorStatusDto> {
    const user = await this.tenantPrisma.queryOne<any>(
      `SELECT "twoFactorConfirmedAt" FROM users WHERE id = $1 AND "deletedAt" IS NULL`,
      [userId],
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      enabled: !!user.twoFactorConfirmedAt,
      confirmedAt: user.twoFactorConfirmedAt,
    };
  }

  async getRecoveryCodes(userId: number): Promise<{ codes: string[] }> {
    const user = await this.tenantPrisma.queryOne<any>(
      `SELECT "twoFactorRecoveryCodes", "twoFactorConfirmedAt" FROM users WHERE id = $1 AND "deletedAt" IS NULL`,
      [userId],
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorConfirmedAt) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const codes = user.twoFactorRecoveryCodes ? JSON.parse(user.twoFactorRecoveryCodes) : [];
    return { codes };
  }

  async regenerateRecoveryCodes(userId: number): Promise<{ codes: string[] }> {
    const user = await this.tenantPrisma.queryOne<any>(
      `SELECT "twoFactorConfirmedAt" FROM users WHERE id = $1 AND "deletedAt" IS NULL`,
      [userId],
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorConfirmedAt) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const codes = this.generateRecoveryCodes();
    await this.tenantPrisma.update('users', userId, {
      twoFactorRecoveryCodes: JSON.stringify(codes),
    });

    return { codes };
  }

  // ============================================================================
  // APPEARANCE
  // ============================================================================

  async updateAppearance(userId: number, dto: UpdateAppearanceDto): Promise<{ themePreference: string }> {
    await this.tenantPrisma.update('users', userId, {
      themePreference: dto.themePreference,
    });

    return { themePreference: dto.themePreference };
  }

  // ============================================================================
  // TOTP HELPERS (pure implementation, no external dependency)
  // ============================================================================

  private verifyTotp(secret: string, code: string): boolean {
    const timeStep = 30;
    const now = Math.floor(Date.now() / 1000);

    // Check current and adjacent time windows (±1 step for clock drift)
    for (const offset of [-1, 0, 1]) {
      const counter = Math.floor((now + offset * timeStep) / timeStep);
      const expected = this.generateTotp(secret, counter);
      if (expected === code) {
        return true;
      }
    }
    return false;
  }

  private generateTotp(secret: string, counter: number): string {
    const secretBuffer = this.decodeBase32(secret);
    const counterBuffer = Buffer.alloc(8);
    for (let i = 7; i >= 0; i--) {
      counterBuffer[i] = counter & 0xff;
      counter = counter >> 8;
    }

    const hmac = crypto.createHmac('sha1', secretBuffer);
    hmac.update(counterBuffer);
    const digest = hmac.digest();

    const offset = digest[digest.length - 1] & 0x0f;
    const code =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);

    return (code % 1000000).toString().padStart(6, '0');
  }

  private encodeBase32(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;

    for (const byte of buffer) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 0x1f];
        bits -= 5;
      }
    }

    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 0x1f];
    }

    return result;
  }

  private decodeBase32(encoded: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bytes: number[] = [];
    let bits = 0;
    let value = 0;

    for (const char of encoded.toUpperCase()) {
      const idx = alphabet.indexOf(char);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    return Buffer.from(bytes);
  }

  private generateRecoveryCodes(count = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(5).toString('hex').toUpperCase();
      // Format as XXXXX-XXXXX
      codes.push(`${code.slice(0, 5)}-${code.slice(5)}`);
    }
    return codes;
  }
}
