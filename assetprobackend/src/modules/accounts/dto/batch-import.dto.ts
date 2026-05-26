import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * One row of a batch CSV upload. Each row represents a single LINE of an
 * expense request. Multiple rows sharing the same `externalRef` are grouped
 * into one expense request with multiple lines.
 *
 * Header-level fields (description, memoFrom, etc.) are taken from the
 * first row of each externalRef group; later rows for the same group only
 * need to supply the per-line fields.
 */
export class BatchImportRowDto {
  // Group identifier — all rows with the same externalRef become one
  // expense request. Also used for idempotency: a second upload of the
  // same externalRef within the same tenant is rejected.
  @ApiProperty({ description: 'Client-side row group reference (e.g. EXP-001)' })
  @IsString()
  externalRef: string;

  // Header fields (read from the first row of each group)
  @ApiProperty({ description: 'Request date, ISO 8601 (YYYY-MM-DD)' })
  @IsDateString()
  requestDate: string;

  @ApiProperty({ description: 'Requester employee email — resolved to employeeId at commit time' })
  @IsString()
  requesterEmail: string;

  @ApiProperty({ description: 'Request description (header)' })
  @IsString()
  description: string;

  @ApiPropertyOptional() @IsOptional() @IsString() memoFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() memoTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subject?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() background?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() justification?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() prayer?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() beneficiaryName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() beneficiaryAccountNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() beneficiaryBankName?: string;

  // Per-line fields
  @ApiProperty({ description: 'GL expense account code (from ifrs_accounts.code)' })
  @IsString()
  expenseAccountCode: string;

  @ApiProperty({ description: 'Line description' })
  @IsString()
  lineDescription: string;

  @ApiProperty({ description: 'Quantity' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ description: 'Unit price' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: 'WHT code (from wht.code) — applies withholding tax if set' })
  @IsOptional()
  @IsString()
  whtCode?: string;
}

export class BatchImportDto {
  @ApiProperty({ type: [BatchImportRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchImportRowDto)
  rows: BatchImportRowDto[];

  @ApiPropertyOptional({ description: 'Optional batch label for audit (auto-generated if omitted)' })
  @IsOptional()
  @IsString()
  batchLabel?: string;
}

/**
 * Historical-load row. Same shape as BatchImportRow plus payment details
 * because historical loads bypass the approval flow and post straight to
 * `paid` with a GL entry against a real bank account on the supplied date.
 */
export class HistoricalLoadRowDto extends BatchImportRowDto {
  @ApiProperty({ description: 'Date the payment actually left the bank (ISO 8601)' })
  @IsDateString()
  paymentDate: string;

  @ApiProperty({ description: 'Bank account code or name (from banks.code or banks.name)' })
  @IsString()
  bankAccountCode: string;

  @ApiPropertyOptional({ description: 'External payment reference (bank confirmation / cheque no.)' })
  @IsOptional()
  @IsString()
  paymentReference?: string;
}

export class HistoricalLoadDto {
  @ApiProperty({ type: [HistoricalLoadRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HistoricalLoadRowDto)
  rows: HistoricalLoadRowDto[];

  @ApiPropertyOptional({ description: 'Optional batch label for audit (auto-generated if omitted)' })
  @IsOptional()
  @IsString()
  batchLabel?: string;
}

/**
 * Per-externalRef validation result returned by the dry-run endpoints.
 * Frontend uses this to render a preview table with OK/error status per
 * group before the user commits.
 */
export interface BatchValidationResult {
  externalRef: string;
  rowCount: number;        // how many CSV rows contributed to this group
  requesterName?: string;  // resolved from email for display
  totalAmount: number;     // summed across lines for this group
  errors: string[];        // empty = OK; any entry = cannot commit this group
  warnings: string[];      // present but non-blocking (e.g. WHT code not found so ignored)
}

export interface BatchDryRunResponse {
  batchRef: string;        // suggested batchRef client should pass on commit
  results: BatchValidationResult[];
  validCount: number;
  invalidCount: number;
}

export interface BatchCommitResponse {
  batchRef: string;
  createdRequestIds: number[];
  failedRefs: Array<{ externalRef: string; error: string }>;
}
