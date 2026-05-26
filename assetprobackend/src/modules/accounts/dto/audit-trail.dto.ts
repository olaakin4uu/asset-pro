import {
  IsString,
  IsInt,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  POST = 'post',
  REVERSE = 'reverse',
  APPROVE = 'approve',
  REJECT = 'reject',
}

export enum AuditEntityType {
  JOURNAL_ENTRY = 'journal_entry',
  ACCOUNT = 'account',
  FISCAL_YEAR = 'fiscal_year',
  BANK_RECONCILIATION = 'bank_reconciliation',
  BANK_TRANSFER = 'bank_transfer',
  EXPENSE_REQUEST = 'expense_request',
  REPORTING_PERIOD = 'reporting_period',
}

// ============================================================================
// QUERY DTOs
// ============================================================================

export class AuditTrailQueryDto {
  @ApiPropertyOptional({
    enum: AuditEntityType,
    description: 'Filter by entity type',
  })
  @IsEnum(AuditEntityType)
  @IsOptional()
  entityType?: AuditEntityType;

  @ApiPropertyOptional({
    description: 'Filter by entity ID',
    example: 123,
  })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  entityId?: number;

  @ApiPropertyOptional({
    enum: AuditAction,
    description: 'Filter by action type',
  })
  @IsEnum(AuditAction)
  @IsOptional()
  action?: AuditAction;

  @ApiPropertyOptional({
    description: 'Filter by user ID who made the change',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  userId?: number;

  @ApiPropertyOptional({
    description: 'Start date (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date (YYYY-MM-DD)',
    example: '2026-12-31',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Search in change descriptions',
    example: 'account code',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 25,
    default: 25,
  })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class FieldChangeDto {
  @ApiProperty({
    description: 'Field name',
    example: 'accountCode',
  })
  fieldName: string;

  @ApiProperty({
    description: 'Field display label',
    example: 'Account Code',
  })
  fieldLabel: string;

  @ApiProperty({
    description: 'Old value (JSON string)',
    example: '1000',
    nullable: true,
  })
  oldValue: any;

  @ApiProperty({
    description: 'New value (JSON string)',
    example: '1001',
    nullable: true,
  })
  newValue: any;

  @ApiProperty({
    description: 'Data type of the field',
    example: 'string',
  })
  dataType: string;
}

export class AuditTrailEntryDto {
  @ApiProperty({
    description: 'Audit entry ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    enum: AuditEntityType,
    description: 'Type of entity changed',
  })
  entityType: AuditEntityType;

  @ApiProperty({
    description: 'ID of the changed entity',
    example: 123,
  })
  entityId: number;

  @ApiProperty({
    description: 'Display name/reference of the entity',
    example: 'JE-2026-001',
  })
  entityReference: string;

  @ApiProperty({
    enum: AuditAction,
    description: 'Action performed',
  })
  action: AuditAction;

  @ApiProperty({
    description: 'User ID who made the change',
    example: 1,
  })
  userId: number;

  @ApiProperty({
    description: 'User name who made the change',
    example: 'John Doe',
  })
  userName: string;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com',
  })
  userEmail: string;

  @ApiProperty({
    description: 'Timestamp of the change',
    example: '2026-02-10T14:30:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'IP address of the user',
    example: '192.168.1.1',
    nullable: true,
  })
  ipAddress: string | null;

  @ApiProperty({
    description: 'User agent string',
    example: 'Mozilla/5.0...',
    nullable: true,
  })
  userAgent: string | null;

  @ApiProperty({
    description: 'Description of the change',
    example: 'Updated journal entry JE-2026-001',
  })
  description: string;

  @ApiProperty({
    description: 'Field-level changes',
    type: [FieldChangeDto],
  })
  @ValidateNested({ each: true })
  @Type(() => FieldChangeDto)
  changes: FieldChangeDto[];

  @ApiPropertyOptional({
    description: 'Old data snapshot (JSON)',
    example: { accountCode: '1000', amount: 100.00 },
    nullable: true,
  })
  oldData?: any;

  @ApiPropertyOptional({
    description: 'New data snapshot (JSON)',
    example: { accountCode: '1001', amount: 150.00 },
    nullable: true,
  })
  newData?: any;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { reason: 'Correction', approvedBy: 'Manager' },
    nullable: true,
  })
  metadata?: Record<string, any>;
}

export class AuditTrailListDto {
  @ApiProperty({
    description: 'Array of audit trail entries',
    type: [AuditTrailEntryDto],
  })
  @ValidateNested({ each: true })
  @Type(() => AuditTrailEntryDto)
  data: AuditTrailEntryDto[];

  @ApiProperty({
    description: 'Total count of entries',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Current page',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 25,
  })
  limit: number;

  @ApiProperty({
    description: 'Total pages',
    example: 6,
  })
  totalPages: number;
}

export class CompareVersionsDto {
  @ApiProperty({
    description: 'First version timestamp',
    example: '2026-02-10T14:00:00Z',
  })
  version1Timestamp: string;

  @ApiProperty({
    description: 'Second version timestamp',
    example: '2026-02-10T14:30:00Z',
  })
  version2Timestamp: string;

  @ApiProperty({
    description: 'Field-level differences',
    type: [FieldChangeDto],
  })
  @ValidateNested({ each: true })
  @Type(() => FieldChangeDto)
  differences: FieldChangeDto[];

  @ApiProperty({
    description: 'Version 1 user',
    example: 'John Doe',
  })
  version1User: string;

  @ApiProperty({
    description: 'Version 2 user',
    example: 'Jane Smith',
  })
  version2User: string;
}

// ============================================================================
// STATISTICS DTOs
// ============================================================================

export class AuditStatisticsDto {
  @ApiProperty({
    description: 'Total audit entries',
    example: 1500,
  })
  totalEntries: number;

  @ApiProperty({
    description: 'Changes by action',
    example: { create: 500, update: 800, delete: 100, post: 100 },
  })
  byAction: Record<AuditAction, number>;

  @ApiProperty({
    description: 'Changes by entity type',
    example: { journal_entry: 1000, account: 300, fiscal_year: 50 },
  })
  byEntityType: Record<AuditEntityType, number>;

  @ApiProperty({
    description: 'Most active users',
    example: [{ userId: 1, userName: 'John Doe', changeCount: 500 }],
    type: 'array',
  })
  mostActiveUsers: Array<{
    userId: number;
    userName: string;
    changeCount: number;
  }>;

  @ApiProperty({
    description: 'Changes by date (last 30 days)',
    example: { '2026-02-10': 50, '2026-02-09': 45 },
  })
  changesByDate: Record<string, number>;
}
