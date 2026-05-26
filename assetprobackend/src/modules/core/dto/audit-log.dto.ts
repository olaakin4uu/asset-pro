import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsIn,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// QUERY DTO
// ============================================================================

export class AuditLogQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 50, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({ example: 'Employee', description: 'Search in entity types and events' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'created', description: 'Filter by event type' })
  @IsOptional()
  @IsIn(['created', 'updated', 'deleted', 'restored'])
  event?: 'created' | 'updated' | 'deleted' | 'restored';

  @ApiPropertyOptional({ example: 'Employee', description: 'Filter by entity type' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ example: 1, description: 'Filter by user ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Type(() => Number)
  userId?: number;

  @ApiPropertyOptional({ example: '2024-01-01', description: 'Filter from date' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2024-12-31', description: 'Filter to date' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class AuditChangeDto {
  @ApiProperty({ example: 'name', description: 'Field name' })
  field: string;

  @ApiProperty({ example: 'Name', description: 'Field label' })
  fieldLabel: string;

  @ApiProperty({ example: 'John', description: 'Old value', nullable: true })
  oldValue: any;

  @ApiProperty({ example: 'Jane', description: 'New value', nullable: true })
  newValue: any;

  @ApiProperty({ example: 'modified', description: 'Change type' })
  type: 'added' | 'removed' | 'modified';
}

export class AuditUserDto {
  @ApiProperty({ example: 1, description: 'User ID' })
  id: number;

  @ApiProperty({ example: 'John Doe', description: 'User name' })
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'User email' })
  email: string;

  @ApiPropertyOptional({ example: 'JD', description: 'User initials' })
  initials?: string;
}

export class AuditLogResponseDto {
  @ApiProperty({ example: 1, description: 'Audit log ID' })
  id: number;

  @ApiProperty({ example: 'created', description: 'Event type' })
  event: 'created' | 'updated' | 'deleted' | 'restored';

  @ApiProperty({ example: 'Created', description: 'Event label' })
  eventLabel: string;

  @ApiProperty({ example: 'primary', description: 'Event color' })
  eventColor: string;

  @ApiPropertyOptional({ example: 123, description: 'Previous audit ID for navigation' })
  previousAuditId?: number | null;

  @ApiPropertyOptional({ example: 125, description: 'Next audit ID for navigation' })
  nextAuditId?: number | null;

  @ApiProperty({ example: 'Employee', description: 'Entity type' })
  auditableType: string;

  @ApiProperty({ example: 'Employee', description: 'Entity type label' })
  auditableTypeLabel: string;

  @ApiProperty({ example: 123, description: 'Entity ID' })
  auditableId: number;

  @ApiPropertyOptional({ example: 1, description: 'User ID' })
  userId?: number | null;

  @ApiPropertyOptional({ description: 'User details' })
  user?: AuditUserDto | null;

  @ApiProperty({ example: 'John Doe', description: 'User name or System' })
  userName: string;

  @ApiPropertyOptional({ description: 'Old values' })
  oldValues?: Record<string, any> | null;

  @ApiPropertyOptional({ description: 'New values' })
  newValues?: Record<string, any> | null;

  @ApiProperty({ description: 'List of field changes', type: [AuditChangeDto] })
  changes: AuditChangeDto[];

  @ApiPropertyOptional({ example: '192.168.1.1', description: 'IP address' })
  ipAddress?: string | null;

  @ApiPropertyOptional({ example: 'Mozilla/5.0...', description: 'User agent' })
  userAgent?: string | null;

  @ApiPropertyOptional({ example: 'Chrome on Windows', description: 'Shortened user agent' })
  userAgentShort?: string | null;

  @ApiPropertyOptional({ example: '/api/employees/123', description: 'Request URL' })
  url?: string | null;

  @ApiPropertyOptional({ example: 'import', description: 'Tags' })
  tags?: string | null;

  @ApiPropertyOptional({ example: 1, description: 'Company ID' })
  companyId?: number | null;

  @ApiPropertyOptional({ example: 1, description: 'Branch ID' })
  branchId?: number | null;

  @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Created timestamp' })
  createdAt: string;

  @ApiProperty({ example: 'Jan 15, 2024 10:30 AM', description: 'Formatted timestamp' })
  createdAtFormatted: string;

  @ApiProperty({ example: '2 hours ago', description: 'Relative time' })
  createdAtRelative: string;

  @ApiProperty({ example: 'Jan 15, 2024', description: 'Date only' })
  createdAtDate: string;

  @ApiProperty({ example: '10:30 AM', description: 'Time only' })
  createdAtTime: string;
}

export class AuditLogListResponseDto {
  @ApiProperty({ type: [AuditLogResponseDto], description: 'List of audit logs' })
  data: AuditLogResponseDto[];

  @ApiProperty({ example: 100, description: 'Total count' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @ApiProperty({ example: 50, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: 2, description: 'Total pages' })
  totalPages: number;
}

export class AuditLogStatsDto {
  @ApiProperty({ example: 1500, description: 'Total audit logs' })
  total: number;

  @ApiProperty({ example: 45, description: 'Logs created today' })
  today: number;

  @ApiProperty({ example: 234, description: 'Logs created this week' })
  thisWeek: number;

  @ApiProperty({ example: 500, description: 'Created events' })
  created: number;

  @ApiProperty({ example: 800, description: 'Updated events' })
  updated: number;

  @ApiProperty({ example: 200, description: 'Deleted events' })
  deleted: number;
}

export class AuditLogEntityTypeDto {
  @ApiProperty({ example: 'Employee', description: 'Entity type short name' })
  value: string;

  @ApiProperty({ example: 'Employee', description: 'Display label' })
  label: string;

  @ApiProperty({ example: 'App\\Models\\Employee', description: 'Full class path' })
  full: string;
}

export class AuditLogUserDto {
  @ApiProperty({ example: 1, description: 'User ID' })
  id: number;

  @ApiProperty({ example: 'John Doe', description: 'User name' })
  name: string;
}
