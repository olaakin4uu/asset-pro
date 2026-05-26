import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsInt,
  IsBoolean,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// CREATE COMPANY DTO
// ============================================================================

export class CreateCompanyDto {
  @ApiProperty({ example: 'Acme Corporation', description: 'Company name' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Acme Corp', description: 'Display name (short name)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ example: 'contact@acme.com', description: 'Company email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+234-800-123-4567', description: 'Company phone' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: '123 Main Street', description: 'Street address' })
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

  @ApiPropertyOptional({ example: 'manufacturing', description: 'Business type' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  businessType?: string;

  @ApiPropertyOptional({ example: 'NGN', description: 'Currency code' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ example: '12345678-0001', description: 'Tax/VAT number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxNumber?: string;

  @ApiPropertyOptional({ example: 'RC-123456', description: 'Company registration number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  registrationNumber?: string;

  @ApiPropertyOptional({ example: 'https://acme.com', description: 'Website URL' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ example: 1, description: 'IFRS Entity ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  entityId?: number;
}

// ============================================================================
// UPDATE COMPANY DTO
// ============================================================================

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  @ApiPropertyOptional({ description: 'Is company active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================================================
// COMPANY RESPONSE DTO
// ============================================================================

export class CompanyResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  displayName?: string;

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

  @ApiProperty()
  businessType: string;

  @ApiProperty()
  currency: string;

  @ApiPropertyOptional()
  taxNumber?: string;

  @ApiPropertyOptional()
  registrationNumber?: string;

  @ApiPropertyOptional()
  website?: string;

  @ApiPropertyOptional({ description: 'Logo file path (internal)' })
  logoPath?: string;

  @ApiPropertyOptional({ description: 'Logo URL (public)' })
  logoUrl?: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  entityId?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  branchCount?: number;

  @ApiPropertyOptional()
  userCount?: number;
}

// ============================================================================
// COMPANY LIST QUERY DTO
// ============================================================================

export class CompanyListQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Include deleted companies' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeDeleted?: boolean;
}

// ============================================================================
// COMPANY LIST RESPONSE DTO
// ============================================================================

export class CompanyListResponseDto {
  @ApiProperty({ type: [CompanyResponseDto] })
  data: CompanyResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
