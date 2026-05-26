import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Header,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { FeatureGuard } from '../../../common/guards/feature.guard';
import { TenantOnly } from '../../../common/decorators/tenant.decorators';
import { RequireModule } from '../../../common/decorators/feature.decorators';
import { AuditLogsService } from '../services/audit-logs.service';
import {
  AuditLogQueryDto,
  AuditLogResponseDto,
  AuditLogListResponseDto,
  AuditLogStatsDto,
  AuditLogEntityTypeDto,
  AuditLogUserDto,
} from '../dto';

@ApiTags('Core - Audit Logs')
@ApiBearerAuth()
@Controller('core/audit-logs')
@UseGuards(JwtAuthGuard, TenantGuard, FeatureGuard)
@TenantOnly()
@RequireModule('core')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  // ============================================================================
  // LIST AUDIT LOGS
  // ============================================================================
  @Get()
  @ApiOperation({ summary: 'Get all audit logs with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of audit logs', type: AuditLogListResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'event', required: false, enum: ['created', 'updated', 'deleted', 'restored'] })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async findAll(@Query() query: AuditLogQueryDto): Promise<AuditLogListResponseDto> {
    return this.auditLogsService.findAll(query);
  }

  // ============================================================================
  // GET AUDIT LOG STATISTICS
  // ============================================================================
  @Get('stats')
  @ApiOperation({ summary: 'Get audit log statistics' })
  @ApiResponse({ status: 200, description: 'Audit log statistics', type: AuditLogStatsDto })
  async getStats(): Promise<AuditLogStatsDto> {
    return this.auditLogsService.getStats();
  }

  // ============================================================================
  // GET ENTITY TYPES
  // ============================================================================
  @Get('entity-types')
  @ApiOperation({ summary: 'Get unique entity types for filter dropdown' })
  @ApiResponse({ status: 200, description: 'List of entity types', type: [AuditLogEntityTypeDto] })
  async getEntityTypes(): Promise<AuditLogEntityTypeDto[]> {
    return this.auditLogsService.getEntityTypes();
  }

  // ============================================================================
  // GET USERS WITH AUDIT ENTRIES
  // ============================================================================
  @Get('users')
  @ApiOperation({ summary: 'Get users who have audit entries' })
  @ApiResponse({ status: 200, description: 'List of users', type: [AuditLogUserDto] })
  async getUsers(): Promise<AuditLogUserDto[]> {
    return this.auditLogsService.getUsers();
  }

  // ============================================================================
  // GET ENTITY HISTORY
  // ============================================================================
  @Get('entity/:type/:id')
  @ApiOperation({ summary: 'Get audit history for a specific entity' })
  @ApiParam({ name: 'type', type: String, description: 'Entity type' })
  @ApiParam({ name: 'id', type: Number, description: 'Entity ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Entity audit history', type: AuditLogListResponseDto })
  async getEntityHistory(
    @Param('type') type: string,
    @Param('id', ParseIntPipe) id: number,
    @Query('page', ParseIntPipe) page?: number,
    @Query('limit', ParseIntPipe) limit?: number,
  ): Promise<AuditLogListResponseDto> {
    return this.auditLogsService.getEntityHistory(type, id, { page, limit });
  }

  // ============================================================================
  // EXPORT AUDIT LOGS TO CSV (must be before :id to prevent route conflict)
  // ============================================================================
  @Get('export')
  @ApiOperation({ summary: 'Export audit logs to CSV (requires export permission)' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  @ApiQuery({ name: 'event', required: false, enum: ['created', 'updated', 'deleted', 'restored'] })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @Header('Content-Type', 'text/csv')
  async exportCsv(@Query() query: AuditLogQueryDto, @Res() res: Response): Promise<void> {
    const csvContent = await this.auditLogsService.exportCsv(query);
    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  }

  // ============================================================================
  // GET AUDIT LOG BY ID
  // ============================================================================
  @Get(':id')
  @ApiOperation({ summary: 'Get audit log by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Audit log details', type: AuditLogResponseDto })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<AuditLogResponseDto> {
    return this.auditLogsService.findOne(id);
  }
}
