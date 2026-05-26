import {
  IsInt,
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ============================================================================
// ENUMS
// ============================================================================

export enum MessagePriority {
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum RecipientType {
  TO = 'TO',
  CC = 'CC',
  BCC = 'BCC',
}

// ============================================================================
// RECIPIENT DTO
// ============================================================================

export class MessageRecipientDto {
  @ApiProperty({ description: 'Recipient user/employee ID' })
  @IsInt()
  @Type(() => Number)
  recipientId: number;

  @ApiPropertyOptional({ description: 'Recipient type', enum: RecipientType, default: RecipientType.TO })
  @IsOptional()
  @IsEnum(RecipientType)
  recipientType?: RecipientType;
}

// ============================================================================
// CREATE / UPDATE DTOs
// ============================================================================

export class CreateMessageDto {
  @ApiProperty({ description: 'Message subject' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Message body (plain text)' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'Message body (HTML)' })
  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @ApiPropertyOptional({ description: 'Message priority', enum: MessagePriority, default: MessagePriority.NORMAL })
  @IsOptional()
  @IsEnum(MessagePriority)
  priority?: MessagePriority;

  @ApiPropertyOptional({ description: 'Referenceable entity type (e.g., SalesOrder)' })
  @IsOptional()
  @IsString()
  referenceableType?: string;

  @ApiPropertyOptional({ description: 'Referenceable entity ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  referenceableId?: number;

  @ApiPropertyOptional({ description: 'Save as draft', default: false })
  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;

  @ApiProperty({ description: 'Message recipients', type: [MessageRecipientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageRecipientDto)
  recipients: MessageRecipientDto[];
}

export class ReplyMessageDto {
  @ApiProperty({ description: 'Reply body (plain text)' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'Reply body (HTML)' })
  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @ApiPropertyOptional({ description: 'Additional recipients', type: [MessageRecipientDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageRecipientDto)
  additionalRecipients?: MessageRecipientDto[];
}

// ============================================================================
// QUERY DTOs
// ============================================================================

export class MessageQueryDto {
  @ApiPropertyOptional({ description: 'Search term (subject, body)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by priority', enum: MessagePriority })
  @IsOptional()
  @IsEnum(MessagePriority)
  priority?: MessagePriority;

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

export class MessageRecipientResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  recipientId: number;

  @ApiProperty({ enum: RecipientType })
  recipientType: RecipientType;

  @ApiPropertyOptional()
  readAt: string | null;

  @ApiPropertyOptional()
  starredAt: string | null;

  @ApiPropertyOptional()
  recipient?: { id: number; name: string; email: string };
}

export class MessageResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  uuid: string;

  @ApiProperty()
  companyId: number;

  @ApiProperty()
  senderId: number;

  @ApiProperty()
  subject: string;

  @ApiProperty()
  body: string;

  @ApiPropertyOptional()
  bodyHtml: string | null;

  @ApiProperty({ enum: MessagePriority })
  priority: MessagePriority;

  @ApiPropertyOptional()
  referenceableType: string | null;

  @ApiPropertyOptional()
  referenceableId: number | null;

  @ApiPropertyOptional()
  parentId: number | null;

  @ApiProperty()
  isDraft: boolean;

  @ApiPropertyOptional()
  sentAt: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  // Related entities
  @ApiPropertyOptional()
  sender?: { id: number; name: string; email: string };

  @ApiPropertyOptional({ type: [MessageRecipientResponseDto] })
  recipients?: MessageRecipientResponseDto[];

  @ApiPropertyOptional({ type: [MessageResponseDto] })
  replies?: MessageResponseDto[];
}

export class PaginatedMessagesDto {
  @ApiProperty({ type: [MessageResponseDto] })
  data: MessageResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}
