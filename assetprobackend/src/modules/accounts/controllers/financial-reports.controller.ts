import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { toRatio } from '../../../common/utils/decimal';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { FinancialReportsService } from '../services/financial-reports.service';
import {
  TrialBalanceQueryDto,
  BalanceSheetQueryDto,
  IncomeStatementQueryDto,
  CashFlowQueryDto,
  AccountStatementQueryDto,
  GroupedTrialBalanceQueryDto,
  TrialBalanceDto,
  BalanceSheetDto,
  IncomeStatementDto,
  CashFlowStatementDto,
  AccountStatementDto,
  GroupedTrialBalanceDto,
} from '../dto/financial-reports.dto';
import { FeatureGuard } from '../../../common/guards/feature.guard';
import { RequireModule, RequireFeature } from '../../../common/decorators/feature.decorators';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

@ApiTags('Financial Reports')
@ApiBearerAuth()
@Controller('accounts/reports')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireModule('accounts')
export class FinancialReportsController {
  constructor(private readonly financialReportsService: FinancialReportsService) {}

  @Get('balance-sheet')
  @ApiOperation({
    summary: 'Generate Balance Sheet report',
    description:
      'Generate an IFRS-compliant balance sheet showing assets, liabilities, and equity as of a specific date',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Balance sheet report generated successfully',
    type: BalanceSheetDto,
  })
  @RequireFeature('accounts', 'accounts.financial_reports')
  async getBalanceSheet(
    @CurrentUser() user: AuthUser,
    @Query() query: BalanceSheetQueryDto,
  ): Promise<BalanceSheetDto> {
    return this.financialReportsService.getBalanceSheet(user.companyId, query);
  }

  @Get('income-statement')
  @ApiOperation({
    summary: 'Generate Income Statement (P&L) report',
    description:
      'Generate an income statement (profit & loss) report showing revenue, expenses, and profit for a period',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Income statement report generated successfully',
    type: IncomeStatementDto,
  })
  @RequireFeature('accounts', 'accounts.financial_reports')
  async getIncomeStatement(
    @CurrentUser() user: AuthUser,
    @Query() query: IncomeStatementQueryDto,
  ): Promise<IncomeStatementDto> {
    return this.financialReportsService.getIncomeStatement(user.companyId, query);
  }

  @Get('trial-balance')
  @ApiOperation({
    summary: 'Generate Trial Balance report',
    description:
      'Generate a trial balance showing all accounts with their debit and credit balances as of a specific date',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trial balance report generated successfully',
    type: TrialBalanceDto,
  })
  @RequireFeature('accounts', 'accounts.financial_reports')
  async getTrialBalance(
    @CurrentUser() user: AuthUser,
    @Query() query: TrialBalanceQueryDto,
  ): Promise<TrialBalanceDto> {
    return this.financialReportsService.getTrialBalance(user.companyId, query);
  }

  @Get('trial-balance-grouped')
  @ApiOperation({
    summary: 'Generate Grouped Trial Balance report',
    description:
      'Generate a trial balance grouped by category or account type, showing subtotals for each group',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Grouped trial balance report generated successfully',
    type: GroupedTrialBalanceDto,
  })
  @RequireFeature('accounts', 'accounts.financial_reports')
  async getGroupedTrialBalance(
    @CurrentUser() user: AuthUser,
    @Query() query: GroupedTrialBalanceQueryDto,
  ): Promise<GroupedTrialBalanceDto> {
    return this.financialReportsService.getGroupedTrialBalance(user.companyId, query);
  }

  @Get('cash-flow')
  @ApiOperation({
    summary: 'Generate Cash Flow Statement',
    description:
      'Generate a cash flow statement showing operating, investing, and financing activities for a period',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cash flow statement generated successfully',
    type: CashFlowStatementDto,
  })
  @RequireFeature('accounts', 'accounts.financial_reports')
  async getCashFlowStatement(
    @CurrentUser() user: AuthUser,
    @Query() query: CashFlowQueryDto,
  ): Promise<CashFlowStatementDto> {
    return this.financialReportsService.getCashFlowStatement(user.companyId, query);
  }

  @Get('account-statement/:accountId')
  @ApiOperation({
    summary: 'Generate Account Statement (Ledger)',
    description:
      'Generate a detailed account statement (ledger) for a specific account showing all transactions and running balance',
  })
  @ApiParam({
    name: 'accountId',
    description: 'Account ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account statement generated successfully',
    type: AccountStatementDto,
  })
  @RequireFeature('accounts', 'accounts.financial_reports')
  async getAccountStatement(
    @CurrentUser() user: AuthUser,
    @Param('accountId', ParseIntPipe) accountId: number,
    @Query() query: AccountStatementQueryDto,
  ): Promise<AccountStatementDto> {
    return this.financialReportsService.getAccountStatement(
      user.companyId,
      accountId,
      query,
    );
  }

  @Get('financial-summary')
  @ApiOperation({
    summary: 'Get Financial Summary for Dashboard',
    description:
      'Get a quick financial summary including key metrics from balance sheet and income statement',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Financial summary retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        period: {
          type: 'object',
          properties: {
            startDate: { type: 'string', example: '2026-01-01' },
            endDate: { type: 'string', example: '2026-12-31' },
          },
        },
        revenue: { type: 'number', example: 1000000 },
        expenses: { type: 'number', example: 700000 },
        grossProfit: { type: 'number', example: 400000 },
        netProfit: { type: 'number', example: 300000 },
        totalAssets: { type: 'number', example: 2000000 },
        totalLiabilities: { type: 'number', example: 800000 },
        totalEquity: { type: 'number', example: 1200000 },
        cashBalance: { type: 'number', example: 150000 },
        isBalanceSheetBalanced: { type: 'boolean', example: true },
      },
    },
  })
  async getFinancialSummary(@CurrentUser() user: AuthUser) {
    const today = new Date().toISOString().split('T')[0];
    const yearStart = `${today.substring(0, 4)}-01-01`;

    // Get income statement for current period
    const incomeStatement = await this.financialReportsService.getIncomeStatement(
      user.companyId,
      {
        startDate: yearStart,
        endDate: today,
      },
    );

    // Get balance sheet
    const balanceSheet = await this.financialReportsService.getBalanceSheet(
      user.companyId,
      {
        asOfDate: today,
      },
    );

    // Get cash position including foreign currency conversion
    const bankCash = await this.financialReportsService.getBankCashStatement(user.companyId, {
      endDate: today,
    });
    const cashBalance = bankCash.totalCashPositionBase;

    return {
      period: {
        startDate: yearStart,
        endDate: today,
      },
      revenue: incomeStatement.revenue.total,
      expenses:
        incomeStatement.costOfSales.total +
        incomeStatement.operatingExpenses.total +
        incomeStatement.otherExpenses.total,
      grossProfit: incomeStatement.grossProfit,
      netProfit: incomeStatement.netProfit,
      totalAssets: balanceSheet.assets.totalAssets,
      totalLiabilities: balanceSheet.liabilities.totalLiabilities,
      totalEquity: balanceSheet.equity.totalEquity,
      cashBalance,
      isBalanceSheetBalanced: balanceSheet.isBalanced,
    };
  }

  @Get('key-metrics')
  @ApiOperation({
    summary: 'Get Key Financial Metrics & Ratios',
    description:
      'Calculate and return key financial metrics including liquidity ratios, profitability ratios, and efficiency ratios',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Key financial metrics calculated successfully',
    schema: {
      type: 'object',
      properties: {
        asOfDate: { type: 'string', example: '2026-12-31' },
        liquidityRatios: {
          type: 'object',
          properties: {
            currentRatio: { type: 'number', example: 2.5 },
            quickRatio: { type: 'number', example: 1.8 },
            cashRatio: { type: 'number', example: 0.5 },
          },
        },
        profitabilityRatios: {
          type: 'object',
          properties: {
            grossProfitMargin: { type: 'number', example: 40.0 },
            operatingProfitMargin: { type: 'number', example: 25.0 },
            netProfitMargin: { type: 'number', example: 15.0 },
            returnOnAssets: { type: 'number', example: 12.0 },
            returnOnEquity: { type: 'number', example: 20.0 },
          },
        },
        leverageRatios: {
          type: 'object',
          properties: {
            debtToEquity: { type: 'number', example: 0.67 },
            debtToAssets: { type: 'number', example: 0.4 },
          },
        },
      },
    },
  })
  async getKeyMetrics(@CurrentUser() user: AuthUser) {
    const today = new Date().toISOString().split('T')[0];
    const yearStart = `${today.substring(0, 4)}-01-01`;

    // Get balance sheet
    const balanceSheet = await this.financialReportsService.getBalanceSheet(
      user.companyId,
      { asOfDate: today },
    );

    // Get income statement
    const incomeStatement = await this.financialReportsService.getIncomeStatement(
      user.companyId,
      {
        startDate: yearStart,
        endDate: today,
      },
    );

    // Calculate liquidity ratios
    const currentAssets = balanceSheet.assets.currentAssets.total;
    const currentLiabilities = balanceSheet.liabilities.currentLiabilities.total;
    const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;

    // Quick assets = Current Assets - Inventory
    const inventoryAccounts = balanceSheet.assets.currentAssets.items.filter((item) =>
      item.accountCode.startsWith('12'),
    );
    const inventory = inventoryAccounts.reduce((sum, item) => sum + item.balance, 0);
    const quickAssets = currentAssets - inventory;
    const quickRatio = currentLiabilities > 0 ? quickAssets / currentLiabilities : 0;

    // Cash ratio
    const cashAccounts = balanceSheet.assets.currentAssets.items.filter(
      (item) => item.accountCode.startsWith('100') || item.accountCode.startsWith('101'),
    );
    const cash = cashAccounts.reduce((sum, item) => sum + item.balance, 0);
    const cashRatio = currentLiabilities > 0 ? cash / currentLiabilities : 0;

    // Calculate profitability ratios
    const grossProfitMargin = incomeStatement.grossProfitMargin;
    const operatingProfitMargin = incomeStatement.operatingProfitMargin;
    const netProfitMargin = incomeStatement.netProfitMargin;

    const totalAssets = balanceSheet.assets.totalAssets;
    const returnOnAssets =
      totalAssets > 0 ? (incomeStatement.netProfit / totalAssets) * 100 : 0;

    const totalEquity = balanceSheet.equity.totalEquity;
    const returnOnEquity =
      totalEquity > 0 ? (incomeStatement.netProfit / totalEquity) * 100 : 0;

    // Calculate leverage ratios
    const totalLiabilities = balanceSheet.liabilities.totalLiabilities;
    const debtToEquity = totalEquity > 0 ? totalLiabilities / totalEquity : 0;
    const debtToAssets = totalAssets > 0 ? totalLiabilities / totalAssets : 0;

    return {
      asOfDate: today,
      period: {
        startDate: yearStart,
        endDate: today,
      },
      liquidityRatios: {
        currentRatio: toRatio(currentRatio),
        quickRatio: toRatio(quickRatio),
        cashRatio: toRatio(cashRatio),
      },
      profitabilityRatios: {
        grossProfitMargin: toRatio(grossProfitMargin),
        operatingProfitMargin: toRatio(operatingProfitMargin),
        netProfitMargin: toRatio(netProfitMargin),
        returnOnAssets: toRatio(returnOnAssets),
        returnOnEquity: toRatio(returnOnEquity),
      },
      leverageRatios: {
        debtToEquity: toRatio(debtToEquity),
        debtToAssets: toRatio(debtToAssets),
      },
    };
  }

  @Get('bank-cash-statement')
  @ApiOperation({ summary: 'Get Bank/Cash Account Statement with transactions per bank' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bank cash statements retrieved' })
  async getBankCashStatement(
    @CurrentUser() user: AuthUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('bankId') bankId?: string,
  ) {
    return this.financialReportsService.getBankCashStatement(user.companyId, {
      startDate,
      endDate,
      bankId: bankId ? parseInt(bankId, 10) : undefined,
    });
  }

  @Get('vat-register')
  @ApiOperation({ summary: 'Get VAT Register — Output VAT (sales) vs Input VAT (purchases)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'VAT register retrieved' })
  async getVatRegister(
    @CurrentUser() user: AuthUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financialReportsService.getVatRegister(user.companyId, { startDate, endDate });
  }

  @Get('wht-remittance')
  @ApiOperation({ summary: 'Get WHT Remittance Report — WHT deducted on purchases and expenses' })
  @ApiResponse({ status: HttpStatus.OK, description: 'WHT remittance report retrieved' })
  async getWhtRemittance(
    @CurrentUser() user: AuthUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financialReportsService.getWhtRemittanceReport(user.companyId, { startDate, endDate });
  }

  @Get('aged-receivables')
  @ApiOperation({ summary: 'Get Aged Receivables — Outstanding customer invoices by aging bucket' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Aged receivables retrieved' })
  async getAgedReceivables(
    @CurrentUser() user: AuthUser,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.financialReportsService.getAgedReceivables(user.companyId, { asOfDate });
  }

  @Get('aged-payables')
  @ApiOperation({ summary: 'Get Aged Payables — Outstanding supplier invoices by aging bucket' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Aged payables retrieved' })
  async getAgedPayables(
    @CurrentUser() user: AuthUser,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.financialReportsService.getAgedPayables(user.companyId, { asOfDate });
  }
}
