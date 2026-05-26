import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsInt,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// CREATE BRANCH DTO
// ============================================================================

export class CreateBranchDto {
  @ApiProperty({ example: 1, description: 'Company ID this branch belongs to' })
  @IsInt()
  @Type(() => Number)
  companyId: number;

  @ApiProperty({ example: 'Lagos Branch', description: 'Branch name' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'LG', description: 'Branch code' })
  @IsString()
  @MaxLength(20)
  code: string;

  @ApiPropertyOptional({ example: 'contact@lagos.acme.com', description: 'Branch email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+234-800-123-4567', description: 'Branch phone' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: '123 Victoria Island', description: 'Street address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Lagos', description: 'City' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Lagos State', description: 'State/Province' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 'Nigeria', description: 'Country' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ example: '100001', description: 'Postal code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ example: 'Africa/Lagos', description: 'Timezone' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ example: true, description: 'Is this the head office' })
  @IsOptional()
  @IsBoolean()
  isHeadOffice?: boolean;
}

// ============================================================================
// UPDATE BRANCH DTO
// ============================================================================

export class UpdateBranchDto extends PartialType(CreateBranchDto) {
  @ApiPropertyOptional({ description: 'Is branch active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================================================
// BRANCH RESPONSE DTO
// ============================================================================

export class BranchResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  companyId: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  state?: string;

  @ApiPropertyOptional()
  country?: string;

  @ApiPropertyOptional()
  postalCode?: string;

  @ApiPropertyOptional()
  timezone?: string;

  @ApiProperty()
  isHeadOffice: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  companyName?: string;

  @ApiPropertyOptional()
  userCount?: number;

  @ApiPropertyOptional()
  warehouseCount?: number;
}

// ============================================================================
// BRANCH LIST QUERY DTO
// ============================================================================

export class BranchListQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Include deleted branches' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeDeleted?: boolean;
}

// ============================================================================
// BRANCH LIST RESPONSE DTO
// ============================================================================

export class BranchListResponseDto {
  @ApiProperty({ type: [BranchResponseDto] })
  data: BranchResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
