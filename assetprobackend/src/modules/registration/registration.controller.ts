import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { RegistrationService } from './registration.service';
import {
  CreateRegistrationDto,
  AvailabilityResponseDto,
  RegistrationResponseDto,
  RegistrationStatusResponseDto,
} from './dto';

@ApiTags('Registration')
@Controller('register')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Get('check-subdomain')
  @ApiOperation({ summary: 'Check if a subdomain is available' })
  @ApiQuery({ name: 'subdomain', description: 'Subdomain to check', example: 'mycompany' })
  @ApiResponse({ status: 200, description: 'Availability check result', type: AvailabilityResponseDto })
  async checkSubdomain(@Query('subdomain') subdomain: string): Promise<AvailabilityResponseDto> {
    if (!subdomain || subdomain.length < 3) {
      return {
        available: false,
        message: 'Subdomain must be at least 3 characters',
      };
    }
    return this.registrationService.checkSubdomainAvailability(subdomain);
  }

  @Get('check-email')
  @ApiOperation({ summary: 'Check if an email is available' })
  @ApiQuery({ name: 'email', description: 'Email to check', example: 'admin@company.com' })
  @ApiResponse({ status: 200, description: 'Availability check result', type: AvailabilityResponseDto })
  async checkEmail(@Query('email') email: string): Promise<AvailabilityResponseDto> {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {
        available: false,
        message: 'Please provide a valid email address',
      };
    }
    return this.registrationService.checkEmailAvailability(email);
  }

  @Get('check-company')
  @ApiOperation({ summary: 'Check if a company name is available' })
  @ApiQuery({ name: 'company_name', description: 'Company name to check', example: 'My Company Ltd' })
  @ApiResponse({ status: 200, description: 'Availability check result', type: AvailabilityResponseDto })
  async checkCompany(@Query('company_name') companyName: string): Promise<AvailabilityResponseDto> {
    if (!companyName || companyName.length < 2) {
      return {
        available: false,
        message: 'Company name must be at least 2 characters',
      };
    }
    return this.registrationService.checkCompanyAvailability(companyName);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start tenant registration' })
  @ApiResponse({ status: 200, description: 'Registration started', type: RegistrationResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async register(@Body() dto: CreateRegistrationDto): Promise<RegistrationResponseDto> {
    return this.registrationService.createRegistration(dto);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get registration status' })
  @ApiQuery({ name: 'registration_id', description: 'Registration ID', example: 'clxyz123456' })
  @ApiResponse({ status: 200, description: 'Registration status', type: RegistrationStatusResponseDto })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async getStatus(@Query('registration_id') registrationId: string): Promise<RegistrationStatusResponseDto> {
    return this.registrationService.getRegistrationStatus(registrationId);
  }
}
