import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ReportsService } from '../services/reports.service';
import { InternalControlsReportService } from '../services/internal-controls-report.service';
import {
  TrialBalanceQueryDto,
  BalanceSheetQueryDto,
  IncomeStatementQueryDto,
  GeneralLedgerQueryDto,
} from '../dto';
import { FeatureGuard } from '../../../common/guards/feature.guard';
import { RequireModule, RequireFeature } from '../../../common/decorators/feature.decorators';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

@ApiTags('Accounting Reports')
@ApiBearerAuth()
@Controller('accounts/reports')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireModule('accounts')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly internalControlsService: InternalControlsReportService,
  ) {}

  @Get('trial-balance')
  @ApiOperation({ summary: 'Generate trial balance report' })
  @ApiResponse({ status: 200, description: 'Trial balance report' })
  @RequireFeature('accounts', 'accounts.financial_reports')
  async getTrialBalance(
    @CurrentUser() user: AuthUser,
    @Query() query: TrialBalanceQueryDto,
  ) {
    return this.reportsService.getTrialBalance(user.companyId, query);
  }

  @Get('balance-sheet')
  @ApiOperation({ summary: 'Generate balance sheet report' })
  @ApiResponse({ status: 200, description: 'Balance sheet report' })
  @RequireFeature('accounts', 'accounts.financial_reports')
  async getBalanceSheet(
    @CurrentUser() user: AuthUser,
    @Query() query: BalanceSheetQueryDto,
  ) {
    return this.reportsService.getBalanceSheet(user.companyId, query);
  }

  @Get('income-statement')
  @ApiOperation({ summary: 'Generate income statement (profit & loss) report' })
  @ApiResponse({ status: 200, description: 'Income statement report' })
  @RequireFeature('accounts', 'accounts.financial_reports')
  async getIncomeStatement(
    @CurrentUser() user: AuthUser,
    @Query() query: IncomeStatementQueryDto,
  ) {
    return this.reportsService.getIncomeStatement(user.companyId, query);
  }

  @Get('general-ledger')
  @ApiOperation({ summary: 'Generate general ledger for an account' })
  @ApiResponse({ status: 200, description: 'General ledger report' })
  @RequireFeature('accounts', 'accounts.financial_reports')
  async getGeneralLedger(
    @CurrentUser() user: AuthUser,
    @Query() query: GeneralLedgerQueryDto,
  ) {
    return this.reportsService.getGeneralLedger(user.companyId, query);
  }

  @Get('balance-sheet/compare')
  @ApiOperation({ summary: 'Get comparative balance sheet (two periods)' })
  @ApiResponse({ status: 200, description: 'Comparative balance sheet' })
  @RequireFeature('accounts', 'accounts.financial_reports')
  async getComparativeBalanceSheet(
    @CurrentUser() user: AuthUser,
    @Query() query: BalanceSheetQueryDto,
  ) {
    const currentReport = await this.reportsService.getBalanceSheet(user.companyId, query);

    // If compareDate is provided, get the comparison period report
    if (query.compareDate) {
      const previousReport = await this.reportsService.getBalanceSheet(user.companyId, {
        asOfDate: query.compareDate,
      });
      return {
        current: currentReport,
        previous: previousReport,
        compareDate: query.compareDate,
      };
    }

    // Default: compare with same date last year
    if (query.comparePrevious) {
      const asOfDate = query.asOfDate || new Date().toISOString().split('T')[0];
      const prevDate = new Date(asOfDate);
      prevDate.setFullYear(prevDate.getFullYear() - 1);
      const previousReport = await this.reportsService.getBalanceSheet(user.companyId, {
        asOfDate: prevDate.toISOString().split('T')[0],
      });
      return {
        current: currentReport,
        previous: previousReport,
        compareDate: prevDate.toISOString().split('T')[0],
      };
    }

    return { current: currentReport, previous: null, compareDate: null };
  }

  @Get('income-statement/compare')
  @ApiOperation({ summary: 'Get comparative income statement (two periods)' })
  @ApiResponse({ status: 200, description: 'Comparative income statement' })
  @RequireFeature('accounts', 'accounts.financial_reports')
  async getComparativeIncomeStatement(
    @CurrentUser() user: AuthUser,
    @Query() query: IncomeStatementQueryDto,
  ) {
    const currentReport = await this.reportsService.getIncomeStatement(user.companyId, query);

    if (query.compareStartDate && query.compareEndDate) {
      const previousReport = await this.reportsService.getIncomeStatement(user.companyId, {
        startDate: query.compareStartDate,
        endDate: query.compareEndDate,
      });
      return {
        current: currentReport,
        previous: previousReport,
        compareStartDate: query.compareStartDate,
        compareEndDate: query.compareEndDate,
      };
    }

    // Default: compare with same period last year
    if (query.comparePrevious) {
      const endDate = query.endDate || new Date().toISOString().split('T')[0];
      const startDate = query.startDate || `${endDate.substring(0, 4)}-01-01`;
      const prevEnd = new Date(endDate);
      prevEnd.setFullYear(prevEnd.getFullYear() - 1);
      const prevStart = new Date(startDate);
      prevStart.setFullYear(prevStart.getFullYear() - 1);
      const previousReport = await this.reportsService.getIncomeStatement(user.companyId, {
        startDate: prevStart.toISOString().split('T')[0],
        endDate: prevEnd.toISOString().split('T')[0],
      });
      return {
        current: currentReport,
        previous: previousReport,
        compareStartDate: prevStart.toISOString().split('T')[0],
        compareEndDate: prevEnd.toISOString().split('T')[0],
      };
    }

    return { current: currentReport, previous: null };
  }

  @Get('internal-controls')
  @ApiOperation({ summary: 'Generate Internal Controls & Risk Report' })
  @ApiResponse({ status: 200, description: 'Internal controls and risk report' })
  @RequireFeature('accounts', 'accounts.financial_reports')
  async getInternalControlsReport(
    @CurrentUser() user: AuthUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.internalControlsService.generateReport(user.companyId, {
      startDate,
      endDate,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get accounting summary for dashboard' })
  @ApiResponse({ status: 200, description: 'Accounting summary' })
  async getAccountingSummary(@CurrentUser() user: AuthUser) {
    const today = new Date().toISOString().split('T')[0];
    const yearStart = `${today.substring(0, 4)}-01-01`;

    // Get income statement for current period
    const incomeStatement = await this.reportsService.getIncomeStatement(user.companyId, {
      startDate: yearStart,
      endDate: today,
    });

    // Get balance sheet
    const balanceSheet = await this.reportsService.getBalanceSheet(user.companyId, {
      asOfDate: today,
    });

    return {
      currentPeriod: {
        startDate: yearStart,
        endDate: today,
      },
      revenue: incomeStatement.revenue.total,
      expenses: incomeStatement.operatingExpenses.total + incomeStatement.otherExpenses.total,
      grossProfit: incomeStatement.grossProfit,
      netProfit: incomeStatement.netProfit,
      totalAssets: balanceSheet.assets.totalAssets,
      totalLiabilities: balanceSheet.liabilities.totalLiabilities,
      totalEquity: balanceSheet.equity.totalEquity,
    };
  }
}
