import {
  IsString, IsOptional, IsNumber, IsPositive, IsDateString, IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMiscReceiptDto {
  @IsNumber()
  @Type(() => Number)
  bankId: number;

  @IsNumber()
  @Type(() => Number)
  glAccountId: number;

  @IsPositive()
  @Type(() => Number)
  amount: number;

  @IsDateString()
  receiptDate: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class UpdateMiscReceiptDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bankId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  glAccountId?: number;

  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsDateString()
  receiptDate?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class MiscReceiptQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['draft', 'posted', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

export interface MiscReceiptResponseDto {
  id: number;
  companyId: number;
  receiptNumber: string;
  bankId: number;
  bankName: string;
  glAccountId: number;
  glAccountCode: string;
  glAccountName: string;
  amount: number;
  receiptDate: string;
  description: string;
  reference: string | null;
  status: string;
  journalEntryId: number | null;
  postedBy: number | null;
  postedAt: string | null;
  createdById: number | null;
  createdAt: string;
  updatedAt: string;
}
