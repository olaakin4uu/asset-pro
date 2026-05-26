import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { BanksService } from '../services/banks.service';
import {
  CreateBankDto,
  UpdateBankDto,
  BankTransferDto,
  CreateBankReconciliationDto,
  UpdateBankReconciliationDto,
  BankQueryDto,
  CreateBankAuthorizationDto,
  UpdateBankAuthorizationDto,
  BankAuthorizationQueryDto,
  CreateBankTransferDto,
  UpdateBankTransferDto,
  BankTransferQueryDto,
  ApproveBankTransferDto,
  RejectBankTransferDto,
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

@ApiTags('Banks')
@ApiBearerAuth()
@Controller('accounts/banks')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireModule('accounts')
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  // ============================================================================
  // BANKS
  // ============================================================================

  @Post()
  @ApiOperation({ summary: 'Create a new bank account' })
  @ApiResponse({ status: 201, description: 'Bank created successfully' })
  @RequireFeature('accounts', 'accounts.banks')
  async createBank(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBankDto,
  ) {
    return this.banksService.createBank(user.companyId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a bank account' })
  @ApiResponse({ status: 200, description: 'Bank updated successfully' })
  @RequireFeature('accounts', 'accounts.banks')
  async updateBank(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBankDto,
  ) {
    return this.banksService.updateBank(user.companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a bank account' })
  @ApiResponse({ status: 200, description: 'Bank deleted successfully' })
  @RequireFeature('accounts', 'accounts.banks')
  async deleteBank(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.banksService.deleteBank(user.companyId, id);
    return { message: 'Bank deleted successfully' };
  }

  @Get('authorized')
  @ApiOperation({ summary: 'Get banks authorized for current user' })
  @ApiResponse({ status: 200, description: 'List of authorized banks' })
  async getAuthorizedBanks(@CurrentUser() user: AuthUser) {
    return this.banksService.getAuthorizedBanks(user.companyId, user.id);
  }

  @Get('cash-accounts')
  @ApiOperation({ summary: 'Get cash and bank GL accounts' })
  @ApiResponse({ status: 200, description: 'List of cash accounts' })
  async getCashAccounts(@CurrentUser() user: AuthUser) {
    return this.banksService.getCashAccounts(user.companyId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all banks' })
  @ApiResponse({ status: 200, description: 'List of banks' })
  async getAllBanks(
    @CurrentUser() user: AuthUser,
    @Query() query: BankQueryDto,
  ) {
    return this.banksService.findAllBanks(user.companyId, query);
  }

  @Get(':id/balance')
  @ApiOperation({ summary: 'Get bank balance' })
  @ApiResponse({ status: 200, description: 'Bank balance details' })
  async getBankBalance(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.banksService.getBankBalance(user.companyId, id);
  }

  // ============================================================================
  // BANK TRANSFERS
  // ============================================================================

  @Post('transfers')
  @ApiOperation({ summary: 'Create a bank transfer' })
  @ApiResponse({ status: 201, description: 'Transfer created successfully' })
  @RequireFeature('accounts', 'accounts.banks')
  async createTransfer(
    @CurrentUser() user: AuthUser,
    @Body() dto: BankTransferDto,
  ) {
    return this.banksService.createTransfer(user.companyId, dto);
  }

  @Get('transfers')
  @ApiOperation({ summary: 'Get all bank transfers' })
  @ApiResponse({ status: 200, description: 'List of transfers' })
  async getAllTransfers(
    @CurrentUser() user: AuthUser,
    @Query('bankId') bankId?: number,
  ) {
    return this.banksService.findAllTransfers(user.companyId, bankId);
  }

  // ============================================================================
  // BANK RECONCILIATIONS
  // ============================================================================

  @Post('reconciliations')
  @ApiOperation({ summary: 'Create a new bank reconciliation' })
  @ApiResponse({ status: 201, description: 'Reconciliation created successfully' })
  @RequireFeature('accounts', 'accounts.bank_reconciliation')
  async createReconciliation(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBankReconciliationDto,
  ) {
    return this.banksService.createReconciliation(user.companyId, dto, user.id);
  }

  @Put('reconciliations/:id')
  @ApiOperation({ summary: 'Update a bank reconciliation' })
  @ApiResponse({ status: 200, description: 'Reconciliation updated successfully' })
  @RequireFeature('accounts', 'accounts.bank_reconciliation')
  async updateReconciliation(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBankReconciliationDto,
  ) {
    return this.banksService.updateReconciliation(user.companyId, id, dto, user.id);
  }

  @Get('reconciliations/:id')
  @ApiOperation({ summary: 'Get bank reconciliation by ID' })
  @ApiResponse({ status: 200, description: 'Reconciliation details' })
  async getReconciliation(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.banksService.findReconciliationById(user.companyId, id);
  }

  @Get('reconciliations')
  @ApiOperation({ summary: 'Get all bank reconciliations' })
  @ApiResponse({ status: 200, description: 'List of reconciliations' })
  async getAllReconciliations(
    @CurrentUser() user: AuthUser,
    @Query('bankId') bankId?: number,
  ) {
    return this.banksService.findAllReconciliations(user.companyId, bankId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bank by ID' })
  @ApiResponse({ status: 200, description: 'Bank details' })
  async getBank(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.banksService.findBankById(user.companyId, id);
  }

  // ============================================================================
  // BANK AUTHORIZATIONS
  // ============================================================================

  @Post(':bankId/authorizations')
  @ApiOperation({ summary: 'Create bank authorization' })
  @ApiResponse({ status: 201, description: 'Authorization created successfully' })
  @RequireFeature('accounts', 'accounts.banks')
  async createAuthorization(
    @CurrentUser() user: AuthUser,
    @Param('bankId', ParseIntPipe) bankId: number,
    @Body() dto: CreateBankAuthorizationDto,
  ) {
    dto.bankId = bankId;
    return this.banksService.createAuthorization(user.companyId, dto);
  }

  @Put('authorizations/:id')
  @ApiOperation({ summary: 'Update bank authorization' })
  @ApiResponse({ status: 200, description: 'Authorization updated successfully' })
  @RequireFeature('accounts', 'accounts.banks')
  async updateAuthorization(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBankAuthorizationDto,
  ) {
    return this.banksService.updateAuthorization(user.companyId, id, dto);
  }

  @Delete('authorizations/:id')
  @ApiOperation({ summary: 'Delete bank authorization' })
  @ApiResponse({ status: 200, description: 'Authorization deleted successfully' })
  @RequireFeature('accounts', 'accounts.banks')
  async deleteAuthorization(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.banksService.deleteAuthorization(user.companyId, id);
    return { message: 'Authorization deleted successfully' };
  }

  @Get(':bankId/authorizations')
  @ApiOperation({ summary: 'Get authorizations for a bank' })
  @ApiResponse({ status: 200, description: 'List of authorizations' })
  async getAuthorizationsByBank(
    @CurrentUser() user: AuthUser,
    @Param('bankId', ParseIntPipe) bankId: number,
  ) {
    return this.banksService.findAuthorizationsByBank(user.companyId, bankId);
  }

  @Get('authorizations/employee/:employeeId')
  @ApiOperation({ summary: 'Get authorizations for an employee' })
  @ApiResponse({ status: 200, description: 'List of authorizations' })
  async getAuthorizationsByEmployee(
    @CurrentUser() user: AuthUser,
    @Param('employeeId', ParseIntPipe) employeeId: number,
  ) {
    return this.banksService.findAuthorizationsByEmployee(user.companyId, employeeId);
  }

  // ============================================================================
  // ENHANCED BANK TRANSFERS (Multi-Item Workflow)
  // ============================================================================

  @Post('transfers/enhanced')
  @ApiOperation({ summary: 'Create enhanced bank transfer with items' })
  @ApiResponse({ status: 201, description: 'Transfer created successfully' })
  @RequireFeature('accounts', 'accounts.banks')
  async createTransferEnhanced(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBankTransferDto,
  ) {
    return this.banksService.createTransferEnhanced(user.companyId, dto, user.id);
  }

  @Put('transfers/:id')
  @ApiOperation({ summary: 'Update bank transfer' })
  @ApiResponse({ status: 200, description: 'Transfer updated successfully' })
  @RequireFeature('accounts', 'accounts.banks')
  async updateTransferEnhanced(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBankTransferDto,
  ) {
    return this.banksService.updateTransferEnhanced(user.companyId, id, dto, user.id);
  }

  @Delete('transfers/:id')
  @ApiOperation({ summary: 'Delete bank transfer' })
  @ApiResponse({ status: 200, description: 'Transfer deleted successfully' })
  @RequireFeature('accounts', 'accounts.banks')
  async deleteTransfer(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.banksService.deleteTransfer(user.companyId, id);
    return { message: 'Transfer deleted successfully' };
  }

  @Get('transfers/list')
  @ApiOperation({ summary: 'Get all bank transfers with filtering' })
  @ApiResponse({ status: 200, description: 'List of transfers' })
  async getAllTransfersEnhanced(
    @CurrentUser() user: AuthUser,
    @Query() query: BankTransferQueryDto,
  ) {
    return this.banksService.findAllTransfersEnhanced(user.companyId, query);
  }

  @Get('transfers/:id')
  @ApiOperation({ summary: 'Get bank transfer by ID' })
  @ApiResponse({ status: 200, description: 'Transfer details' })
  async getTransferById(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.banksService.findTransferById(user.companyId, id);
  }

  @Post('transfers/:id/submit')
  @ApiOperation({ summary: 'Submit bank transfer for approval' })
  @ApiResponse({ status: 200, description: 'Transfer submitted successfully' })
  @RequireFeature('accounts', 'accounts.banks')
  async submitTransfer(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.banksService.submitTransfer(user.companyId, id, user.id);
  }

  @Post('transfers/:id/approve')
  @ApiOperation({ summary: 'Approve bank transfer' })
  @ApiResponse({ status: 200, description: 'Transfer approved successfully' })
  @RequireFeature('accounts', 'accounts.banks')
  async approveTransfer(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveBankTransferDto,
  ) {
    return this.banksService.approveTransfer(user.companyId, id, user.id, dto);
  }

  @Post('transfers/:id/reject')
  @ApiOperation({ summary: 'Reject bank transfer' })
  @ApiResponse({ status: 200, description: 'Transfer rejected successfully' })
  @RequireFeature('accounts', 'accounts.banks')
  async rejectTransfer(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectBankTransferDto,
  ) {
    return this.banksService.rejectTransfer(user.companyId, id, user.id, dto);
  }

  @Post('transfers/:id/post')
  @ApiOperation({ summary: 'Post bank transfer to GL' })
  @ApiResponse({ status: 200, description: 'Transfer posted successfully' })
  @RequireFeature('accounts', 'accounts.banks')
  async postTransfer(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.banksService.postTransfer(user.companyId, id, user.id);
  }

  @Post('transfers/:id/cancel')
  @ApiOperation({ summary: 'Cancel bank transfer' })
  @ApiResponse({ status: 200, description: 'Transfer cancelled successfully' })
  @RequireFeature('accounts', 'accounts.banks')
  async cancelTransfer(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.banksService.cancelTransfer(user.companyId, id, user.id);
  }
}
