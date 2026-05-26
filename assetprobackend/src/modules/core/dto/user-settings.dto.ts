import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsIn,
} from 'class-validator';

// ============================================================================
// UPDATE PROFILE DTO
// ============================================================================

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe', description: 'Full name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'john@example.com', description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'en', enum: ['en', 'yo', 'ha', 'ig'], description: 'UI language' })
  @IsOptional()
  @IsString()
  locale?: string;
}

// ============================================================================
// CHANGE PASSWORD DTO (from settings)
// ============================================================================

export class SettingsChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: 'New password' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  })
  newPassword: string;

  @ApiProperty({ description: 'Confirm new password' })
  @IsString()
  confirmPassword: string;
}

// ============================================================================
// 2FA DTOs
// ============================================================================

export class Confirm2faDto {
  @ApiProperty({ description: 'TOTP code from authenticator app' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code: string;
}

export class Disable2faDto {
  @ApiProperty({ description: 'Current password to confirm 2FA disable' })
  @IsString()
  password: string;
}

export class TwoFactorSetupResponseDto {
  @ApiProperty({ description: 'TOTP secret' })
  secret: string;

  @ApiProperty({ description: 'otpauth:// URI for QR code' })
  otpauthUrl: string;

  @ApiProperty({ description: 'Recovery codes', type: [String] })
  recoveryCodes: string[];
}

export class TwoFactorStatusDto {
  @ApiProperty()
  enabled: boolean;

  @ApiPropertyOptional()
  confirmedAt?: Date;
}

// ============================================================================
// APPEARANCE DTO
// ============================================================================

export class UpdateAppearanceDto {
  @ApiProperty({
    example: 'default',
    description: 'Theme preference',
    enum: ['default', 'professional', 'vibrant', 'modern'],
  })
  @IsString()
  @IsIn(['default', 'professional', 'vibrant', 'modern'])
  themePreference: string;
}

// ============================================================================
// PROFILE RESPONSE DTO
// ============================================================================

export class SettingsProfileResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  companyId?: number;

  @ApiPropertyOptional()
  companyName?: string;

  @ApiPropertyOptional()
  branchId?: number;

  @ApiPropertyOptional()
  branchName?: string;

  @ApiProperty()
  userType: string;

  @ApiPropertyOptional()
  themePreference?: string;

  @ApiPropertyOptional({ description: 'UI language: en|yo|ha|ig' })
  locale?: string;

  @ApiPropertyOptional()
  signaturePath?: string;

  @ApiProperty()
  twoFactorEnabled: boolean;

  @ApiPropertyOptional()
  twoFactorConfirmedAt?: Date;

  @ApiProperty()
  createdAt: Date;
}
