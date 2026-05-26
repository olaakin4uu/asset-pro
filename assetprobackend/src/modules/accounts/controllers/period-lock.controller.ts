import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { PeriodLockService } from '../services/period-lock.service';

interface AuthUser {
  id: number;
  companyId: number;
  tenantSlug: string;
}

@ApiTags('Accounts - Period Locks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('accounts/period-locks')
export class PeriodLockController {
  constructor(private readonly periodLockService: PeriodLockService) {}

  @Get()
  @ApiOperation({ summary: 'List period locks for company' })
  @ApiResponse({ status: 200, description: 'List of period locks' })
  async list(
    @CurrentUser() user: AuthUser,
    @Query('year') year?: string,
  ) {
    return this.periodLockService.listLocks(
      user.companyId,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get('check')
  @ApiOperation({ summary: 'Check if a specific date is in a locked period' })
  @ApiResponse({ status: 200, description: 'Lock status' })
  async check(
    @CurrentUser() user: AuthUser,
    @Query('date') date: string,
  ) {
    const isLocked = await this.periodLockService.isPeriodLocked(user.companyId, date);
    return { date, isLocked };
  }

  @Post('lock')
  @ApiOperation({ summary: 'Lock an accounting period (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Period locked' })
  async lock(
    @CurrentUser() user: AuthUser,
    @Body() body: { year: number; period: number; reason?: string },
  ) {
    return this.periodLockService.lockPeriod(
      user.companyId,
      body.year,
      body.period,
      user.id,
      body.reason,
    );
  }

  @Post('unlock')
  @ApiOperation({ summary: 'Unlock an accounting period (Super Admin only, requires reason)' })
  @ApiResponse({ status: 200, description: 'Period unlocked' })
  async unlock(
    @CurrentUser() user: AuthUser,
    @Body() body: { year: number; period: number; reason: string },
  ) {
    return this.periodLockService.unlockPeriod(
      user.companyId,
      body.year,
      body.period,
      user.id,
      body.reason,
    );
  }
}
