import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  IsEnum,
} from 'class-validator';

// ============================================================================
// USER TYPES (for unified login)
// ============================================================================

export enum UserTypeEnum {
  EMPLOYEE = 'EMPLOYEE',
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER',
  INVESTOR = 'INVESTOR',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
}

// ============================================================================
// USER PROFILE (defined first to avoid circular reference)
// ============================================================================

export class UserProfileDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  role: string;

  @ApiProperty({ required: false, enum: UserTypeEnum })
  userType?: UserTypeEnum;

  @ApiProperty({ required: false })
  tenantId?: string;

  @ApiProperty({ required: false })
  tenantName?: string;

  @ApiProperty({ required: false })
  companyId?: number;

  @ApiProperty({ required: false })
  companyName?: string;

  @ApiProperty({ required: false })
  branchId?: number;

  // Employee-specific fields
  @ApiProperty({ required: false, description: 'Employee ID (if userType is EMPLOYEE)' })
  employeeId?: number;

  @ApiProperty({ required: false })
  employeeName?: string;

  @ApiProperty({ required: false, description: 'Whether this employee counts against user limit' })
  isCountedUser?: boolean;

  @ApiProperty({ required: false })
  departmentId?: number;

  // Customer-specific fields
  @ApiProperty({ required: false, description: 'Customer ID (if userType is CUSTOMER)' })
  customerId?: number;

  @ApiProperty({ required: false })
  customerName?: string;

  // Supplier-specific fields
  @ApiProperty({ required: false, description: 'Supplier ID (if userType is SUPPLIER)' })
  supplierId?: number;

  @ApiProperty({ required: false })
  supplierName?: string;

  @ApiProperty({ required: false, type: [String], description: 'User permission names' })
  permissions?: string[];

  @ApiProperty({ required: false, description: 'UI language code: en, yo, ha, ig' })
  locale?: string;
}

// ============================================================================
// LOGIN
// ============================================================================

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ required: false, example: 'acme', description: 'Tenant subdomain for tenant user login' })
  @IsOptional()
  @IsString()
  subdomain?: string;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresIn: number;

  @ApiProperty()
  user: UserProfileDto;
}

// ============================================================================
// REGISTER (Tenant Registration)
// ============================================================================

export class RegisterTenantDto {
  @ApiProperty({ example: 'Acme Corporation' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  companyName: string;

  @ApiProperty({ example: 'acme' })
  @IsString()
  @MinLength(3)
  @MaxLength(63)
  @Matches(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, {
    message: 'Subdomain must be lowercase alphanumeric with optional hyphens',
  })
  subdomain: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  adminName: string;

  @ApiProperty({ example: 'john@acme.com' })
  @IsEmail()
  adminEmail: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  })
  password: string;

  @ApiProperty({ example: 'standard', enum: ['starter', 'standard', 'professional'] })
  @IsString()
  planSlug: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class RegisterResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  registrationId: string;

  @ApiProperty()
  statusUrl: string;
}

// ============================================================================
// PASSWORD RESET
// ============================================================================

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  })
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  })
  newPassword: string;
}

// ============================================================================
// REFRESH TOKEN
// ============================================================================

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

// ============================================================================
// CHECK SUBDOMAIN
// ============================================================================

export class CheckSubdomainDto {
  @ApiProperty({ example: 'acme' })
  @IsString()
  @MinLength(3)
  @MaxLength(63)
  @Matches(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, {
    message: 'Subdomain must be lowercase alphanumeric with optional hyphens',
  })
  subdomain: string;
}

export class CheckSubdomainResponseDto {
  @ApiProperty()
  available: boolean;

  @ApiProperty({ required: false })
  suggestion?: string;
}
