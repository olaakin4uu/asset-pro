import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsBoolean,
  ValidateNested,
  IsDateString,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExpenseRequestAttachmentDto {
  @ApiProperty() id: number;
  @ApiProperty() expenseRequestId: number;
  @ApiProperty() filename: string;
  @ApiProperty() originalName: string;
  @ApiProperty() path: string;
  @ApiProperty() url: string;
  @ApiPropertyOptional() mimeType?: string;
  @ApiPropertyOptional() size?: number;
  @ApiPropertyOptional() uploadedBy?: number;
  @ApiProperty() createdAt: string;
}

export class AddAttachmentDto {
  @ApiProperty() @IsString() filename: string;
  @ApiProperty() @IsString() originalName: string;
  @ApiProperty() @IsString() path: string;
  @ApiProperty() @IsString() url: string;
  @ApiPropertyOptional() @IsString() @IsOptional() mimeType?: string;
  @ApiPropertyOptional() @IsInt() @IsOptional() size?: number;
}

export class ExpenseRequestLineDto {
  @ApiProperty({ description: 'Line description' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ description: 'GL Account ID' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  accountId?: number;

  @ApiPropertyOptional({ description: 'Expense Account ID' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  expenseAccountId?: number;

  @ApiProperty({ description: 'Quantity', minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ description: 'Unit price', minimum: 0 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Withholding Tax ID' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  whtId?: number;

  @ApiPropertyOptional({ description: 'WHT applicable for this line', default: false })
  @IsBoolean()
  @IsOptional()
  whtApplicable?: boolean;

  @ApiPropertyOptional({ description: 'WHT rate override' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  whtRate?: number;

  @ApiPropertyOptional({ description: 'Remarks for this line' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  remarks?: string;
}

export class CreateExpenseRequestDto {
  @ApiPropertyOptional({ description: 'Requester employee ID (optional if requesterName is provided)' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  requesterId?: number;

  @ApiPropertyOptional({ description: 'Requester display name (free-text fallback when no employee record)' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  requesterName?: string;

  @ApiProperty({ description: 'Request date' })
  @IsDateString()
  requestDate: string;

  @ApiProperty({ description: 'Request description' })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Branch ID' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  branchId?: number;

  @ApiPropertyOptional({ description: 'Department ID' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  departmentId?: number;

  @ApiPropertyOptional({ description: 'Beneficiary name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  beneficiaryName?: string;

  @ApiPropertyOptional({ description: 'Beneficiary account number' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  beneficiaryAccountNumber?: string;

  @ApiPropertyOptional({ description: 'Beneficiary bank name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  beneficiaryBankName?: string;

  @ApiPropertyOptional({ description: 'Beneficiary bank ID' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  beneficiaryBankId?: number;

  @ApiPropertyOptional({ description: 'Memo from' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  memoFrom?: string;

  @ApiPropertyOptional({ description: 'Memo to' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  memoTo?: string;

  @ApiPropertyOptional({ description: 'Subject' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  subject?: string;

  @ApiPropertyOptional({ description: 'Background information' })
  @IsString()
  @IsOptional()
  background?: string;

  @ApiPropertyOptional({ description: 'Justification' })
  @IsString()
  @IsOptional()
  justification?: string;

  @ApiPropertyOptional({ description: 'Prayer / request conclusion' })
  @IsString()
  @IsOptional()
  prayer?: string;

  @ApiPropertyOptional({ description: 'Currency code', default: 'NGN' })
  @IsString()
  @IsOptional()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Expense GL Account ID' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  expenseAccountId?: number;

  @ApiPropertyOptional({ description: 'Bank account ID for payment' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  bankAccountId?: number;

  @ApiPropertyOptional({ description: 'WHT applicable', default: false })
  @IsBoolean()
  @IsOptional()
  whtApplicable?: boolean;

  @ApiPropertyOptional({ description: 'WHT rate' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  whtRate?: number;

  @ApiProperty({ description: 'Expense lines', type: [ExpenseRequestLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseRequestLineDto)
  lines: ExpenseRequestLineDto[];

  @ApiPropertyOptional({ description: 'Fleet trip ID — auto-updates trip cost on payment (fleet module only)' })
  @IsInt() @IsOptional() tripId?: number;
  @Type(() => Number)

  @ApiPropertyOptional({ description: 'Fleet vehicle ID — creates vehicle cost entry on payment (fleet module only)' })
  @IsInt() @IsOptional() vehicleId?: number;
  @Type(() => Number)

  @ApiPropertyOptional({ description: 'Fleet cost type: FUEL | TOLL | PARKING | DRIVER_ALLOWANCE | MAINTENANCE | INSURANCE | LICENSING | TYRE | OTHER' })
  @IsString() @IsOptional() fleetCostType?: string;

  @ApiPropertyOptional({ description: 'Supporting document attachments uploaded before submission', type: [AddAttachmentDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => AddAttachmentDto) @IsOptional()
  attachments?: AddAttachmentDto[];
}

export class UpdateExpenseRequestDto {
  @ApiPropertyOptional() @IsDateString() @IsOptional() requestDate?: string;
  @ApiPropertyOptional() @IsString() @MaxLength(2000) @IsOptional() description?: string;
  @ApiPropertyOptional() @IsString() @MaxLength(2000) @IsOptional() notes?: string;
  @ApiPropertyOptional() @IsInt() @IsOptional() departmentId?: number;
  @ApiPropertyOptional() @IsString() @MaxLength(255) @IsOptional() memoFrom?: string;
  @ApiPropertyOptional() @IsString() @MaxLength(255) @IsOptional() memoTo?: string;
  @ApiPropertyOptional() @IsString() @MaxLength(500) @IsOptional() subject?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() background?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() justification?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() prayer?: string;
  @ApiPropertyOptional() @IsString() @MaxLength(255) @IsOptional() beneficiaryName?: string;
  @ApiPropertyOptional() @IsString() @MaxLength(50) @IsOptional() beneficiaryAccountNumber?: string;
  @ApiPropertyOptional() @IsString() @MaxLength(255) @IsOptional() beneficiaryBankName?: string;
  @ApiPropertyOptional() @IsInt() @IsOptional() beneficiaryBankId?: number;
  @ApiPropertyOptional() @IsInt() @IsOptional() expenseAccountId?: number;
  @ApiPropertyOptional() @IsInt() @IsOptional() bankAccountId?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() whtApplicable?: boolean;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() whtRate?: number;
  @ApiPropertyOptional() @IsString() @MaxLength(3) @IsOptional() currency?: string;

  @ApiPropertyOptional({ description: 'Expense lines', type: [ExpenseRequestLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseRequestLineDto)
  @IsOptional()
  lines?: ExpenseRequestLineDto[];

  @ApiPropertyOptional({ description: 'Fleet trip ID' })
  @IsInt() @IsOptional() tripId?: number;
  @Type(() => Number)

  @ApiPropertyOptional({ description: 'Fleet vehicle ID' })
  @IsInt() @IsOptional() vehicleId?: number;
  @Type(() => Number)

  @ApiPropertyOptional({ description: 'Fleet cost type' })
  @IsString() @IsOptional() fleetCostType?: string;
}

export class ApproveExpenseRequestLineDto {
  @ApiProperty({ description: 'Expense request line ID' })
  @IsInt()
  @Type(() => Number)
  lineId: number;

  @ApiProperty({ description: 'GL Account ID to assign to this line' })
  @IsInt()
  @Type(() => Number)
  accountId: number;
}

export class ApproveExpenseRequestDto {
  @ApiPropertyOptional({ description: 'Approved amount (defaults to total amount)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  approvedAmount?: number;

  @ApiPropertyOptional({ description: 'Approval comments' })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  comments?: string;

  @ApiPropertyOptional({ description: 'Accountant step: expense GL account ID' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  expenseAccountId?: number;

  @ApiPropertyOptional({ description: 'Accountant step: line account allocations', type: [ApproveExpenseRequestLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApproveExpenseRequestLineDto)
  @IsOptional()
  lines?: ApproveExpenseRequestLineDto[];
}

export class RejectExpenseRequestDto {
  @ApiProperty({ description: 'Rejection reason' })
  @IsString()
  @MaxLength(1000)
  reason: string;
}

export class PayExpenseRequestDto {
  @ApiPropertyOptional({ description: 'Bank account ID for payment' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  bankAccountId?: number;

  @ApiPropertyOptional({ description: 'Payment notes' })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Payment reference' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  paymentReference?: string;

  @ApiPropertyOptional({ description: 'Payment date (cannot be in the future)' })
  @IsString()
  @IsOptional()
  paymentDate?: string;
}

export class ExpenseRequestQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by requester ID' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  requesterId?: number;

  @ApiPropertyOptional({ description: 'Start date filter' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Minimum total amount filter' })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum total amount filter' })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 25 })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  limit?: number;
}

