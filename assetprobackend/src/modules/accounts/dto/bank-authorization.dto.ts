import {
  IsInt,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateBankAuthorizationDto {
  @ApiProperty({ description: 'Bank ID' })
  @IsInt()
  @Type(() => Number)
  bankId: number;

  @ApiProperty({ description: 'Employee ID to authorize' })
  @IsInt()
  @Type(() => Number)
  employeeId: number;

  @ApiPropertyOptional({ description: 'Can view bank transactions', default: true })
  @IsBoolean()
  @IsOptional()
  canView?: boolean;

  @ApiPropertyOptional({ description: 'Can deposit to bank', default: false })
  @IsBoolean()
  @IsOptional()
  canDeposit?: boolean;

  @ApiPropertyOptional({ description: 'Can withdraw from bank', default: false })
  @IsBoolean()
  @IsOptional()
  canWithdraw?: boolean;

  @ApiPropertyOptional({ description: 'Can transfer between banks', default: false })
  @IsBoolean()
  @IsOptional()
  canTransfer?: boolean;

  @ApiPropertyOptional({ description: 'Maximum transaction amount' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'Whether authorization is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateBankAuthorizationDto {
  @ApiPropertyOptional({ description: 'Can view bank transactions' })
  @IsBoolean()
  @IsOptional()
  canView?: boolean;

  @ApiPropertyOptional({ description: 'Can deposit to bank' })
  @IsBoolean()
  @IsOptional()
  canDeposit?: boolean;

  @ApiPropertyOptional({ description: 'Can withdraw from bank' })
  @IsBoolean()
  @IsOptional()
  canWithdraw?: boolean;

  @ApiPropertyOptional({ description: 'Can transfer between banks' })
  @IsBoolean()
  @IsOptional()
  canTransfer?: boolean;

  @ApiPropertyOptional({ description: 'Maximum transaction amount' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'Whether authorization is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class BankAuthorizationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by bank ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  bankId?: number;

  @ApiPropertyOptional({ description: 'Filter by employee ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  employeeId?: number;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

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
