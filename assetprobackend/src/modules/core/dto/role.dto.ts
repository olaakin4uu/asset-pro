import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  MaxLength,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// ============================================================================
// CREATE ROLE DTO
// ============================================================================

export class CreateRoleDto {
  @ApiProperty({ example: 'Sales Manager', description: 'Role name' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Manages sales team and approves orders', description: 'Role description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: [1, 2, 3], description: 'Permission IDs to assign' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  permissionIds?: number[];
}

// ============================================================================
// UPDATE ROLE DTO
// ============================================================================

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}

// ============================================================================
// ROLE RESPONSE DTO
// ============================================================================

export class RoleResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  guardName: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: [String] })
  permissions?: string[];

  @ApiPropertyOptional()
  userCount?: number;

  @ApiPropertyOptional({ description: 'Whether this is a system role (Super Admin, System Admin)' })
  isSystem?: boolean;
}

// ============================================================================
// ROLE LIST QUERY DTO
// ============================================================================

export class RoleListQueryDto {
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

  @ApiPropertyOptional({ description: 'Include permission details' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includePermissions?: boolean;
}

// ============================================================================
// ROLE LIST RESPONSE DTO
// ============================================================================

export class RoleListResponseDto {
  @ApiProperty({ type: [RoleResponseDto] })
  data: RoleResponseDto[];

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
// ASSIGN PERMISSIONS TO ROLE DTO
// ============================================================================

export class AssignPermissionsToRoleDto {
  @ApiProperty({ example: [1, 2, 3], description: 'Permission IDs to assign' })
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  permissionIds: number[];
}

// ============================================================================
// PERMISSION RESPONSE DTO
// ============================================================================

export class PermissionResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  module?: string;

  @ApiProperty()
  guardName: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// ============================================================================
// PERMISSION LIST QUERY DTO
// ============================================================================

export class PermissionListQueryDto {
  @ApiPropertyOptional({ description: 'Filter by module' })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Group by module', default: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  groupByModule?: boolean;
}

// ============================================================================
// PERMISSION LIST RESPONSE DTO
// ============================================================================

export class PermissionListResponseDto {
  @ApiProperty({ type: [PermissionResponseDto] })
  data: PermissionResponseDto[];

  @ApiProperty()
  total: number;
}

// ============================================================================
// GROUPED PERMISSIONS RESPONSE DTO
// ============================================================================

export class GroupedPermissionsResponseDto {
  @ApiProperty({
    example: {
      Core: {
        Users: [{ id: 1, name: 'view users' }, { id: 2, name: 'create users' }],
        Roles: [{ id: 3, name: 'view roles' }],
      },
      HRPayroll: {
        Employees: [{ id: 4, name: 'view employees' }],
        Leaves: [{ id: 5, name: 'view leaves' }, { id: 6, name: 'approve leaves' }],
      },
    },
    description: 'Permissions grouped by Module → Category',
  })
  data: Record<string, Record<string, PermissionResponseDto[]>>;

  @ApiProperty()
  total: number;

  @ApiProperty()
  moduleCount: number;
}
