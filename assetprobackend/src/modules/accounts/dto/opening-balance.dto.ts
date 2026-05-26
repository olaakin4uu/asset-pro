import { IsInt, IsNumber, IsOptional, IsString, IsArray, ValidateNested, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpeningBalanceEntryDto {
  @ApiProperty({ description: 'Account ID' })
  @IsInt()
  @Type(() => Number)
  accountId: number;

  @ApiProperty({ description: 'Balance amount (positive value)', minimum: 0 })
  @IsNumber()
  @Min(0)
  balance: number;

  @ApiProperty({ description: 'Balance type: debit or credit', enum: ['debit', 'credit'] })
  @IsString()
  @IsEnum(['debit', 'credit'])
  balanceType: 'debit' | 'credit';
}

export class SetOpeningBalancesDto {
  @ApiProperty({ description: 'Year for opening balances' })
  @IsInt()
  @Type(() => Number)
  year: number;

  @ApiProperty({ description: 'Period for opening balances (0 = Opening)' })
  @IsInt()
  @Type(() => Number)
  @Min(0)
  period: number;

  @ApiProperty({ description: 'List of opening balance entries', type: [OpeningBalanceEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpeningBalanceEntryDto)
  entries: OpeningBalanceEntryDto[];
}

export class UpdateOpeningBalanceDto {
  @ApiPropertyOptional({ description: 'Balance amount (positive value)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  balance?: number;

  @ApiPropertyOptional({ description: 'Balance type: debit or credit', enum: ['debit', 'credit'] })
  @IsString()
  @IsEnum(['debit', 'credit'])
  @IsOptional()
  balanceType?: 'debit' | 'credit';
}

export class OpeningBalanceQueryDto {
  @ApiPropertyOptional({ description: 'Year for opening balances' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ description: 'Period for opening balances' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  period?: number;

  @ApiPropertyOptional({ description: 'Account type filter' })
  @IsString()
  @IsOptional()
  accountType?: string;

  @ApiPropertyOptional({ description: 'Include zero balances', default: false })
  @IsOptional()
  includeZeroBalances?: boolean;
}
