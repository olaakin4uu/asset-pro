import {
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ============================================================================
// QUERY DTOs
// ============================================================================

export class NotificationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by notification type' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Filter by read status (true/false)' })
  @IsOptional()
  @IsString()
  isRead?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 25 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty({ description: 'Notification title (extracted from data)' })
  title: string;

  @ApiProperty({ description: 'Notification message (extracted from data)' })
  message: string;

  @ApiProperty({ description: 'Whether the notification has been read' })
  isRead: boolean;

  @ApiProperty()
  notifiableType: string;

  @ApiProperty()
  notifiableId: number;

  @ApiProperty()
  data: any;

  @ApiPropertyOptional()
  readAt: string | null;

  @ApiPropertyOptional()
  companyId: number | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class UnreadCountDto {
  @ApiProperty()
  count: number;
}

export class PaginatedNotificationsDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data: NotificationResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}
