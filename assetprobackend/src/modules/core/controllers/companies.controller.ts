import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer'; // Required for Express.Multer.File type
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { FeatureGuard } from '../../../common/guards/feature.guard';
import { FileStorageService } from '../../../common/services/file-storage.service';
import { TenantOnly, CurrentTenant } from '../../../common/decorators/tenant.decorators';
import type { TenantContext } from '../../../common/decorators/tenant.decorators';
import { RequireModule } from '../../../common/decorators/feature.decorators';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../../auth/decorators/current-user.decorator';
import { QuotaGuard, CheckQuota } from '../../../common/guards/quota.guard';
import { CompaniesService } from '../services/companies.service';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyListQueryDto,
  CompanyResponseDto,
  CompanyListResponseDto,
} from '../dto';

@ApiTags('Core - Companies')
@ApiBearerAuth()
@Controller('core/companies')
@UseGuards(JwtAuthGuard, TenantGuard, FeatureGuard, PermissionsGuard)
@TenantOnly()
@RequireModule('core')
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly fileStorage: FileStorageService,
  ) {}

  // ============================================================================
  // CREATE COMPANY
  // ============================================================================
  @Post()
  @RequirePermission('create companies')
  @UseGuards(QuotaGuard)
  @CheckQuota('companies')
  @ApiOperation({ summary: 'Create a new company' })
  @ApiResponse({ status: 201, description: 'Company created', type: CompanyResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async create(
    @Body() dto: CreateCompanyDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<CompanyResponseDto> {
    return this.companiesService.create(dto, user.id as number);
  }

  // ============================================================================
  // LIST COMPANIES
  // ============================================================================
  @Get()
  @RequirePermission('view companies')
  @ApiOperation({ summary: 'Get all companies with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of companies', type: CompanyListResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(@Query() query: CompanyListQueryDto): Promise<CompanyListResponseDto> {
    return this.companiesService.findAll(query);
  }

  // ============================================================================
  // GET COMPANY BY ID
  // ============================================================================
  @Get(':id')
  @RequirePermission('view companies')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Company details', type: CompanyResponseDto })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<CompanyResponseDto> {
    return this.companiesService.findOne(id);
  }

  // ============================================================================
  // UPDATE COMPANY
  // ============================================================================
  @Patch(':id')
  @RequirePermission('edit companies')
  @ApiOperation({ summary: 'Update company' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Company updated', type: CompanyResponseDto })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<CompanyResponseDto> {
    return this.companiesService.update(id, dto, user.id as number);
  }

  // ============================================================================
  // DELETE COMPANY
  // ============================================================================
  @Delete(':id')
  @RequirePermission('delete companies')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete company (soft delete)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Company deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete company with active users' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.companiesService.remove(id);
  }

  // ============================================================================
  // GET COMPANY STATISTICS
  // ============================================================================
  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get company statistics (branches, users, etc.)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Company statistics' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getStatistics(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Record<string, number>> {
    return this.companiesService.getStatistics(id);
  }

  // ============================================================================
  // UPDATE COMPANY LOGO
  // ============================================================================
  @Post(':id/logo')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('logo'))
  @ApiOperation({ summary: 'Update company logo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        logo: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Logo updated', type: CompanyResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async updateLogo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<CompanyResponseDto> {
    // Get current company to check for existing logo
    const company = await this.companiesService.findOne(id);

    // Delete old logo if exists
    if (company.logoPath) {
      await this.fileStorage.delete(company.logoPath);
    }

    // Store new logo
    const result = await this.fileStorage.store(
      {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        buffer: file.buffer,
        size: file.size,
      },
      {
        destination: 'logos',
        tenantSlug: tenant.tenantSlug,
        maxSizeBytes: 2 * 1024 * 1024, // 2MB max for logos
      },
    );

    return this.companiesService.updateLogo(id, result.path);
  }

  // ============================================================================
  // SEED ACCOUNTS (backfill for companies created before auto-seed was added)
  // ============================================================================
  @Post(':id/seed-accounts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Copy chart of accounts from oldest company into this company (idempotent)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Accounts seeded' })
  async seedAccounts(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.companiesService.seedAccountsForCompany(id);
    return { message: 'Chart of accounts seeded successfully' };
  }

  // ============================================================================
  // DELETE COMPANY LOGO
  // ============================================================================
  @Delete(':id/logo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete company logo' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Logo deleted', type: CompanyResponseDto })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async deleteLogo(@Param('id', ParseIntPipe) id: number): Promise<CompanyResponseDto> {
    const company = await this.companiesService.findOne(id);

    if (company.logoPath) {
      await this.fileStorage.delete(company.logoPath);
    }

    return this.companiesService.updateLogo(id, null);
  }
}
