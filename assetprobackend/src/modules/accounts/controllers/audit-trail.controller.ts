import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuditTrailService } from '../services/audit-trail.service';
import {
  AuditTrailQueryDto,
  AuditTrailListDto,
  AuditTrailEntryDto,
  AuditStatisticsDto,
  CompareVersionsDto,
  AuditEntityType,
} from '../dto/audit-trail.dto';
import { FeatureGuard } from '../../../common/guards/feature.guard';
import { RequireModule } from '../../../common/decorators/feature.decorators';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

@ApiTags('Audit Trail')
@ApiBearerAuth()
@Controller('accounts/audit-trail')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireModule('accounts')
export class AuditTrailController {
  constructor(private readonly auditTrailService: AuditTrailService) {}

  @Get()
  @ApiOperation({
    summary: 'Get audit trail entries',
    description:
      'Retrieve audit trail entries with filtering, search, and pagination',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Audit trail entries retrieved successfully',
    type: AuditTrailListDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async getAuditTrail(
    @Query() query: AuditTrailQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AuditTrailListDto> {
    return this.auditTrailService.getAuditTrail(query, user.tenantId);
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({
    summary: 'Get audit trail for a specific entity',
    description: 'Retrieve complete audit history for a specific entity',
  })
  @ApiParam({
    name: 'entityType',
    enum: AuditEntityType,
    description: 'Type of entity',
  })
  @ApiParam({
    name: 'entityId',
    type: Number,
    description: 'Entity ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Entity audit trail retrieved successfully',
    type: [AuditTrailEntryDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async getEntityAuditTrail(
    @Param('entityType') entityType: AuditEntityType,
    @Param('entityId', ParseIntPipe) entityId: number,
    @CurrentUser() user: AuthUser,
  ): Promise<AuditTrailEntryDto[]> {
    return this.auditTrailService.getEntityAuditTrail(
      entityType,
      entityId,
      user.tenantId,
    );
  }

  @Get('compare/:entityType/:entityId')
  @ApiOperation({
    summary: 'Compare two versions of an entity',
    description: 'Compare field-level differences between two versions',
  })
  @ApiParam({
    name: 'entityType',
    enum: AuditEntityType,
    description: 'Type of entity',
  })
  @ApiParam({
    name: 'entityId',
    type: Number,
    description: 'Entity ID',
  })
  @ApiQuery({
    name: 'timestamp1',
    type: String,
    description: 'First version timestamp (ISO 8601)',
    example: '2026-02-10T14:00:00Z',
  })
  @ApiQuery({
    name: 'timestamp2',
    type: String,
    description: 'Second version timestamp (ISO 8601)',
    example: '2026-02-10T14:30:00Z',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Version comparison completed successfully',
    type: CompareVersionsDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Version not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async compareVersions(
    @Param('entityType') entityType: AuditEntityType,
    @Param('entityId', ParseIntPipe) entityId: number,
    @Query('timestamp1') timestamp1: string,
    @Query('timestamp2') timestamp2: string,
    @CurrentUser() user: AuthUser,
  ): Promise<CompareVersionsDto> {
    return this.auditTrailService.compareVersions(
      entityType,
      entityId,
      timestamp1,
      timestamp2,
      user.tenantId,
    );
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Get audit trail statistics',
    description:
      'Get statistics about audit trail activity including counts by action, entity type, and user',
  })
  @ApiQuery({
    name: 'startDate',
    type: String,
    required: false,
    description: 'Start date for statistics (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    required: false,
    description: 'End date for statistics (YYYY-MM-DD)',
    example: '2026-12-31',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    type: AuditStatisticsDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: AuthUser,
  ): Promise<AuditStatisticsDto> {
    return this.auditTrailService.getStatistics(
      startDate,
      endDate,
      user?.tenantId,
    );
  }
}
