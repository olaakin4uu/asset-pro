import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Matches, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckSubdomainDto {
  @ApiProperty({ description: 'Subdomain to check availability', example: 'mycompany' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Subdomain must be at least 3 characters' })
  @MaxLength(50, { message: 'Subdomain must not exceed 50 characters' })
  @Matches(/^[a-z0-9_-]+$/, { message: 'Subdomain can only contain lowercase letters, numbers, dashes, and underscores' })
  subdomain: string;
}

export class CheckEmailDto {
  @ApiProperty({ description: 'Email to check availability', example: 'admin@company.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;
}

export class CheckCompanyDto {
  @ApiProperty({ description: 'Company name to check availability', example: 'My Company Ltd' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Company name must be at least 2 characters' })
  @MaxLength(100, { message: 'Company name must not exceed 100 characters' })
  company_name: string;
}

export class CreateRegistrationDto {
  @ApiProperty({ description: 'Company name', example: 'My Company Ltd' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Company name must be at least 2 characters' })
  @MaxLength(100, { message: 'Company name must not exceed 100 characters' })
  company_name: string;

  @ApiProperty({ description: 'Subdomain for the tenant', example: 'mycompany' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Subdomain must be at least 3 characters' })
  @MaxLength(50, { message: 'Subdomain must not exceed 50 characters' })
  @Matches(/^[a-z0-9_-]+$/, { message: 'Subdomain can only contain lowercase letters, numbers, dashes, and underscores' })
  subdomain: string;

  @ApiProperty({ description: 'Administrator name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Administrator name must be at least 2 characters' })
  admin_name: string;

  @ApiProperty({ description: 'Administrator email', example: 'admin@company.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  admin_email: string;

  @ApiPropertyOptional({ description: 'Administrator phone', example: '+234 800 000 0000' })
  @IsString()
  @IsOptional()
  admin_phone?: string;

  @ApiProperty({ description: 'Password', example: 'SecurePass123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @ApiProperty({ description: 'Password confirmation', example: 'SecurePass123' })
  @IsString()
  @IsNotEmpty()
  password_confirmation: string;

  @ApiProperty({ description: 'Terms acceptance', example: true })
  @IsBoolean()
  terms_accepted: boolean;

  @ApiProperty({ description: 'Plan slug', example: 'standard' })
  @IsString()
  @IsNotEmpty()
  plan_slug: string;
}

export class RegistrationStatusDto {
  @ApiProperty({ description: 'Registration ID', example: 'clxyz123456' })
  @IsString()
  @IsNotEmpty()
  registration_id: string;
}

export class AvailabilityResponseDto {
  @ApiProperty({ description: 'Whether the value is available' })
  available: boolean;

  @ApiProperty({ description: 'Human-readable message' })
  message: string;
}

export class RegistrationResponseDto {
  @ApiProperty({ description: 'Registration ID for tracking progress' })
  registration_id: string;

  @ApiProperty({ description: 'Status message' })
  message: string;
}

export class RegistrationStatusResponseDto {
  @ApiProperty({ description: 'Registration ID' })
  registration_id: string;

  @ApiProperty({ description: 'Current status', enum: ['pending', 'processing', 'completed', 'failed'] })
  status: string;

  @ApiProperty({ description: 'Progress percentage (0-100)' })
  progress: number;

  @ApiProperty({ description: 'Current step message' })
  message: string;

  @ApiPropertyOptional({ description: 'Redirect URL (only when completed)' })
  redirect_url?: string;

  @ApiPropertyOptional({ description: 'Error message (only when failed)' })
  error?: string;
}
