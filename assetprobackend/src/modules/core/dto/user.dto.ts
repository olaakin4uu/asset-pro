import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum UserType {
  EMPLOYEE = 'EMPLOYEE',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
  EXTERNAL = 'EXTERNAL',
}

// ============================================================================
// CREATE USER DTO
// ============================================================================

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!', description: 'User password' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 1, description: 'Company ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  companyId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Branch ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;

  @ApiPropertyOptional({ enum: UserType, description: 'User type' })
  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;

  @ApiPropertyOptional({ example: [1, 2], description: 'Role IDs to assign' })
  @IsOptional()
  @IsInt({ each: true })
  @Type(() => Number)
  roleIds?: number[];
}

// ============================================================================
// UPDATE USER DTO
// ============================================================================

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password', 'email'])) {
  @ApiPropertyOptional({ example: 'john.new@example.com', description: 'New email (optional)' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'dark', description: 'Theme preference' })
  @IsOptional()
  @IsString()
  themePreference?: string;

  @ApiPropertyOptional({ example: [1, 2], description: 'Company IDs the user can access/switch to' })
  @IsOptional()
  @IsInt({ each: true })
  @Type(() => Number)
  accessibleCompanyIds?: number[];

  @ApiPropertyOptional({ example: [1, 2, 3], description: 'Branch IDs the user can access/switch to' })
  @IsOptional()
  @IsInt({ each: true })
  @Type(() => Number)
  accessibleBranchIds?: number[];
}

// ============================================================================
// CHANGE PASSWORD DTO
// ============================================================================

export class ChangeUserPasswordDto {
  @ApiProperty({ description: 'New password' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

// ============================================================================
// USER RESPONSE DTO
// ============================================================================

export class UserResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  emailVerifiedAt?: Date;

  @ApiPropertyOptional()
  companyId?: number;

  @ApiPropertyOptional()
  branchId?: number;

  @ApiProperty({ enum: UserType })
  userType: UserType;

  @ApiPropertyOptional()
  themePreference?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: [String] })
  roles?: string[];

  @ApiPropertyOptional({ type: [String] })
  permissions?: string[];

  @ApiPropertyOptional({ type: [Number] })
  accessibleCompanyIds?: number[];

  @ApiPropertyOptional({ type: [Number] })
  accessibleBranchIds?: number[];
}

// ============================================================================
// USER LIST QUERY DTO
// ============================================================================

export class UserListQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 20, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, description: 'Filter by company' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Type(() => Number)
  companyId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filter by branch' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Type(() => Number)
  branchId?: number;

  @ApiPropertyOptional({ enum: UserType, description: 'Filter by user type' })
  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;

  @ApiPropertyOptional({ description: 'Filter by role name' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Include deleted users' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeDeleted?: boolean;
}

// ============================================================================
// USER LIST RESPONSE DTO
// ============================================================================

export class UserListResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  data: UserResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

// ============================================================================
// ASSIGN ROLES DTO
// ============================================================================

export class AssignRolesDto {
  @ApiProperty({ example: [1, 2], description: 'Role IDs to assign' })
  @IsInt({ each: true })
  @Type(() => Number)
  roleIds: number[];
}

// ============================================================================
// ASSIGN PERMISSIONS DTO
// ============================================================================

export class AssignPermissionsDto {
  @ApiProperty({ example: [1, 2], description: 'Permission IDs to assign directly' })
  @IsInt({ each: true })
  @Type(() => Number)
  permissionIds: number[];
}

// ============================================================================
// IMPORT USERS DTOs
// ============================================================================

export class ImportUserItemDto {
  @ApiProperty({ description: 'User full name', example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Login email address (unique key)', example: 'john@company.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Role name to assign (must exist in system)', example: 'Accountant' })
  @IsString()
  @IsOptional()
  roleName?: string;

  @ApiPropertyOptional({ description: 'Branch name to assign (must exist in system)', example: 'Lagos Branch' })
  @IsString()
  @IsOptional()
  branchName?: string;

  @ApiPropertyOptional({ description: 'Whether user account is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ImportUsersDto {
  @ApiProperty({ description: 'Array of users to import', type: [ImportUserItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportUserItemDto)
  users: ImportUserItemDto[];

  @ApiPropertyOptional({
    description: 'How to handle existing email addresses: skip (default) | update (name/role/branch) | overwrite (all fields)',
    enum: ['skip', 'update', 'overwrite'],
    default: 'skip',
  })
  @IsString()
  @IsOptional()
  importMode?: 'skip' | 'update' | 'overwrite';

  @ApiPropertyOptional({
    description: 'How to set passwords: temp_password (auto-generate, returned in result) | default_password (use defaultPassword field)',
    enum: ['temp_password', 'default_password'],
    default: 'temp_password',
  })
  @IsString()
  @IsOptional()
  passwordMode?: 'temp_password' | 'default_password';

  @ApiPropertyOptional({ description: 'Default password for all new users (required when passwordMode = default_password)', minLength: 8 })
  @IsString()
  @IsOptional()
  @MinLength(8)
  defaultPassword?: string;
}
