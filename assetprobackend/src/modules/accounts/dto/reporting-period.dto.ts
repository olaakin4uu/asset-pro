import {
  IsInt,
  IsOptional,
  IsString,
  IsIn,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ============================================================================
// REPORTING PERIOD DTOs
// ============================================================================

export class CreateReportingPeriodDto {
  @ApiProperty({ description: 'Calendar year', example: 2026 })
  @IsInt()
  @Type(() => Number)
  calendarYear: number;

  @ApiProperty({ description: 'Period number (1-13)', example: 1 })
  @IsInt()
  @Type(() => Number)
  number: number;

  @ApiProperty({ description: 'Period label', example: "Jan '26" })
  @IsString()
  label: string;

  @ApiProperty({ description: 'Period start date', example: '2026-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Period end date', example: '2026-01-31' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Initial status',
    enum: ['OPEN', 'ADJUSTING', 'CLOSED'],
    default: 'OPEN',
  })
  @IsString()
  @IsOptional()
  @IsIn(['OPEN', 'ADJUSTING', 'CLOSED'])
  status?: string;
}

export class UpdateReportingPeriodDto {
  @ApiPropertyOptional({
    description: 'Period status',
    enum: ['OPEN', 'ADJUSTING', 'CLOSED'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['OPEN', 'ADJUSTING', 'CLOSED'])
  status?: string;
}

export class ReportingPeriodQueryDto {
  @ApiPropertyOptional({ description: 'Filter by calendar year' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  calendarYear?: number;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['OPEN', 'ADJUSTING', 'CLOSED'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['OPEN', 'ADJUSTING', 'CLOSED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Search term' })
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
