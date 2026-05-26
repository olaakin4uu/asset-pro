import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import {
  CreateReportingPeriodDto,
  UpdateReportingPeriodDto,
  ReportingPeriodQueryDto,
} from '../dto';

export interface ReportingPeriodRecord {
  id: number;
  entityId: number;
  calendarYear: number;
  number: number;
  label: string;
  startDate: Date;
  endDate: Date;
  status: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ReportingPeriodsService {
  private readonly logger = new Logger(ReportingPeriodsService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  async create(
    entityId: number,
    dto: CreateReportingPeriodDto,
  ): Promise<ReportingPeriodRecord> {
    // Validate calendar year is reasonable
    if (dto.calendarYear < 2000 || dto.calendarYear > 2100) {
      throw new BadRequestException('Calendar year must be between 2000 and 2100');
    }

    if (dto.number < 1 || dto.number > 13) {
      throw new BadRequestException('Period number must be between 1 and 13');
    }

    // Check for duplicate year+number for the same entity
    const existing = await this.tenantPrisma.queryOne<ReportingPeriodRecord>(
      `SELECT * FROM ifrs_reporting_periods
       WHERE "entityId" = $1 AND "calendarYear" = $2 AND number = $3 AND "deletedAt" IS NULL`,
      [entityId, dto.calendarYear, dto.number],
    );

    if (existing) {
      throw new BadRequestException(
        `Reporting period ${dto.number} for year ${dto.calendarYear} already exists`,
      );
    }

    return this.tenantPrisma.insert<ReportingPeriodRecord>('ifrs_reporting_periods', {
      entityId,
      calendarYear: dto.calendarYear,
      number: dto.number,
      label: dto.label,
      startDate: dto.startDate,
      endDate: dto.endDate,
      status: dto.status || 'OPEN',
    });
  }

  async update(
    entityId: number,
    periodId: number,
    dto: UpdateReportingPeriodDto,
  ): Promise<ReportingPeriodRecord> {
    const period = await this.findById(entityId, periodId);

    // Cannot update a closed period (except to reopen it via dedicated endpoint)
    if (period.status === 'CLOSED' && dto.status !== 'OPEN' && dto.status !== 'ADJUSTING') {
      throw new BadRequestException(
        'Cannot update a closed reporting period. Use the reopen endpoint first.',
      );
    }

    const updateData: Record<string, unknown> = {};
    if (dto.status !== undefined) updateData.status = dto.status;

    if (Object.keys(updateData).length === 0) {
      return period;
    }

    const updated = await this.tenantPrisma.update<ReportingPeriodRecord>(
      'ifrs_reporting_periods',
      periodId,
      updateData,
    );

    if (!updated) {
      throw new NotFoundException('Reporting period not found');
    }

    return updated;
  }

  async remove(entityId: number, periodId: number): Promise<void> {
    const period = await this.findById(entityId, periodId);

    if (period.status === 'CLOSED') {
      throw new BadRequestException('Cannot delete a closed reporting period');
    }

    await this.tenantPrisma.softDelete('ifrs_reporting_periods', periodId);
  }

  async findById(entityId: number, periodId: number): Promise<ReportingPeriodRecord> {
    const period = await this.tenantPrisma.queryOne<ReportingPeriodRecord>(
      `SELECT * FROM ifrs_reporting_periods
       WHERE id = $1 AND "entityId" = $2 AND "deletedAt" IS NULL`,
      [periodId, entityId],
    );

    if (!period) {
      throw new NotFoundException('Reporting period not found');
    }

    return period;
  }

  async findAll(
    entityId: number,
    query: ReportingPeriodQueryDto,
  ): Promise<{
    data: ReportingPeriodRecord[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Auto-close expired OPEN periods (endDate < today)
    await this.tenantPrisma.query(
      `UPDATE ifrs_reporting_periods
       SET status = 'CLOSED', "updatedAt" = NOW()
       WHERE "entityId" = $1
         AND status = 'OPEN'
         AND "endDate" < CURRENT_DATE
         AND "deletedAt" IS NULL`,
      [entityId],
    );

    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;

    let sql = `SELECT * FROM ifrs_reporting_periods WHERE "entityId" = $1 AND "deletedAt" IS NULL`;
    let countSql = `SELECT COUNT(*) as count FROM ifrs_reporting_periods WHERE "entityId" = $1 AND "deletedAt" IS NULL`;
    const params: unknown[] = [entityId];
    let paramIndex = 2;

    if (query.calendarYear) {
      sql += ` AND "calendarYear" = $${paramIndex}`;
      countSql += ` AND "calendarYear" = $${paramIndex}`;
      params.push(query.calendarYear);
      paramIndex++;
    }

    if (query.status) {
      sql += ` AND status = $${paramIndex}`;
      countSql += ` AND status = $${paramIndex}`;
      params.push(query.status);
      paramIndex++;
    }

    if (query.search) {
      sql += ` AND (CAST("calendarYear" AS TEXT) ILIKE $${paramIndex} OR label ILIKE $${paramIndex})`;
      countSql += ` AND (CAST("calendarYear" AS TEXT) ILIKE $${paramIndex} OR label ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY "calendarYear" DESC, number ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const [data, countResult] = await Promise.all([
      this.tenantPrisma.query<ReportingPeriodRecord>(sql, params),
      this.tenantPrisma.queryOne<{ count: string }>(countSql, params.slice(0, -2)),
    ]);

    return {
      data,
      total: parseInt(countResult?.count || '0', 10),
      page,
      limit,
    };
  }

  async closePeriod(entityId: number, periodId: number): Promise<ReportingPeriodRecord> {
    const period = await this.findById(entityId, periodId);

    if (period.status === 'CLOSED') {
      throw new BadRequestException('Reporting period is already closed');
    }

    // Check that all prior periods are closed (same year with lower number, or earlier year)
    const openPriorPeriods = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ifrs_reporting_periods
       WHERE "entityId" = $1
       AND (
         ("calendarYear" = $2 AND number < $3) OR
         "calendarYear" < $2
       )
       AND status != 'CLOSED'
       AND "deletedAt" IS NULL`,
      [entityId, period.calendarYear, period.number],
    );

    if (parseInt(openPriorPeriods?.count || '0', 10) > 0) {
      throw new BadRequestException(
        'All prior reporting periods must be closed before closing this period',
      );
    }

    const updated = await this.tenantPrisma.update<ReportingPeriodRecord>(
      'ifrs_reporting_periods',
      periodId,
      { status: 'CLOSED' },
    );

    if (!updated) {
      throw new NotFoundException('Reporting period not found');
    }

    this.logger.log(`Reporting period ${periodId} (${period.calendarYear} P${period.number}) closed for entity ${entityId}`);
    return updated;
  }

  async reopenPeriod(entityId: number, periodId: number): Promise<ReportingPeriodRecord> {
    const period = await this.findById(entityId, periodId);

    if (period.status !== 'CLOSED') {
      throw new BadRequestException('Only closed reporting periods can be reopened');
    }

    // Check that no later periods are closed (same year with higher number, or later year)
    const closedLaterPeriods = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ifrs_reporting_periods
       WHERE "entityId" = $1
       AND (
         ("calendarYear" = $2 AND number > $3) OR
         "calendarYear" > $2
       )
       AND status = 'CLOSED'
       AND "deletedAt" IS NULL`,
      [entityId, period.calendarYear, period.number],
    );

    if (parseInt(closedLaterPeriods?.count || '0', 10) > 0) {
      throw new BadRequestException(
        'Cannot reopen this period because later periods are already closed. Reopen the later periods first.',
      );
    }

    const updated = await this.tenantPrisma.update<ReportingPeriodRecord>(
      'ifrs_reporting_periods',
      periodId,
      { status: 'ADJUSTING' },
    );

    if (!updated) {
      throw new NotFoundException('Reporting period not found');
    }

    this.logger.log(`Reporting period ${periodId} (${period.calendarYear} P${period.number}) reopened for entity ${entityId}`);
    return updated;
  }
}
