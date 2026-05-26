import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}

export enum CategoryType {
  NON_CURRENT_ASSET = 'non_current_asset',
  CONTRA_ASSET = 'contra_asset',
  INVENTORY = 'inventory',
  BANK = 'bank',
  CURRENT_ASSET = 'current_asset',
  RECEIVABLE = 'receivable',
  NON_CURRENT_LIABILITY = 'non_current_liability',
  CONTROL = 'control',
  CURRENT_LIABILITY = 'current_liability',
  PAYABLE = 'payable',
  EQUITY = 'equity',
  OPERATING_REVENUE = 'operating_revenue',
  OPERATING_EXPENSE = 'operating_expense',
  NON_OPERATING_REVENUE = 'non_operating_revenue',
  DIRECT_EXPENSE = 'direct_expense',
  OVERHEAD_EXPENSE = 'overhead_expense',
  OTHER_EXPENSE = 'other_expense',
  RECONCILIATION = 'reconciliation',
}

export class CreateAccountDto {
  @ApiProperty({ description: 'Account code (unique within company)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;

  @ApiProperty({ description: 'Account name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Account description' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ enum: AccountType, description: 'Account type' })
  @IsEnum(AccountType)
  accountType: AccountType;

  @ApiPropertyOptional({ description: 'IFRS 18 account type for compliance' })
  @IsString()
  @IsOptional()
  ifrs18AccountType?: string;

  @ApiPropertyOptional({ description: 'Parent account ID for hierarchical structure' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  parentId?: number;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Currency ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  currencyId?: number;

  @ApiPropertyOptional({ description: 'Entity ID for IFRS entity' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  entityId?: number;

  @ApiPropertyOptional({ description: 'Whether this is a posting account', default: true })
  @IsBoolean()
  @IsOptional()
  isPosting?: boolean;

  @ApiPropertyOptional({ description: 'Whether account uses closing rate for forex', default: false })
  @IsBoolean()
  @IsOptional()
  closingRate?: boolean;

  @ApiPropertyOptional({ description: 'Whether account is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateAccountDto {
  @ApiPropertyOptional({ description: 'Account name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Account description' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: AccountType, description: 'Account type' })
  @IsEnum(AccountType)
  @IsOptional()
  accountType?: AccountType;

  @ApiPropertyOptional({ description: 'IFRS 18 account type' })
  @IsString()
  @IsOptional()
  ifrs18AccountType?: string;

  @ApiPropertyOptional({ description: 'Parent account ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  parentId?: number;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Currency ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  currencyId?: number;

  @ApiPropertyOptional({ description: 'Whether this is a posting account' })
  @IsBoolean()
  @IsOptional()
  isPosting?: boolean;

  @ApiPropertyOptional({ description: 'Whether account uses closing rate' })
  @IsBoolean()
  @IsOptional()
  closingRate?: boolean;

  @ApiPropertyOptional({ description: 'Whether account is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: CategoryType, description: 'Category type' })
  @IsEnum(CategoryType)
  categoryType: CategoryType;

  @ApiPropertyOptional({ description: 'Category code' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional({ description: 'Entity ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  entityId?: number;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Category name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ enum: CategoryType, description: 'Category type' })
  @IsEnum(CategoryType)
  @IsOptional()
  categoryType?: CategoryType;

  @ApiPropertyOptional({ description: 'Category code' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  code?: string;
}

export class AccountQueryDto {
  @ApiPropertyOptional({ description: 'Filter by account type' })
  @IsEnum(AccountType)
  @IsOptional()
  accountType?: AccountType;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Filter by parent ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  parentId?: number;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by posting status' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isPosting?: boolean;

  @ApiPropertyOptional({ description: 'Search term for name or code' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 25 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

// ============================================================================
// ACCOUNT IMPORT DTOs
// ============================================================================

export class ImportAccountItemDto {
  @ApiProperty({ description: 'Account code (max 20 chars, unique per company)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;

  @ApiProperty({ description: 'Account name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Account type: asset | liability | equity | revenue | expense' })
  @IsString()
  @IsNotEmpty()
  accountType: string;

  @ApiPropertyOptional({ description: 'Category type (e.g. current_asset, operating_revenue)' })
  @IsString()
  @IsOptional()
  categoryType?: string;

  @ApiPropertyOptional({ description: 'Parent account code — creates hierarchy' })
  @IsString()
  @IsOptional()
  parentCode?: string;

  @ApiPropertyOptional({ description: 'Account description (max 1000 chars)' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Whether transactions can post directly to this account', default: true })
  @IsBoolean()
  @IsOptional()
  isPosting?: boolean;

  @ApiPropertyOptional({ description: 'IFRS 18 classification: operating | investing | financing (revenue/expense only)' })
  @IsString()
  @IsOptional()
  ifrs18AccountType?: string;

  @ApiPropertyOptional({ description: 'Use closing exchange rate for forex translation', default: false })
  @IsBoolean()
  @IsOptional()
  closingRate?: boolean;

  @ApiPropertyOptional({ description: 'Whether this account is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ImportAccountsDto {
  @ApiProperty({ description: 'Array of accounts to import', type: [ImportAccountItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportAccountItemDto)
  accounts: ImportAccountItemDto[];

  @ApiPropertyOptional({
    description: 'How to handle existing accounts: skip (default) | update (name/desc/category only) | overwrite (all fields)',
    enum: ['skip', 'update', 'overwrite'],
    default: 'skip',
  })
  @IsString()
  @IsOptional()
  importMode?: 'skip' | 'update' | 'overwrite';
}
