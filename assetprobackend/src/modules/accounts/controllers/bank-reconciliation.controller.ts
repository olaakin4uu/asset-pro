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
import { BankReconciliationService } from '../services/bank-reconciliation.service';
import {
  CreateBankReconciliationDto,
  UpdateBankReconciliationDto,
  BankReconciliationQueryDto,
  CreateBankReconciliationItemDto,
  UpdateBankReconciliationItemDto,
  BulkClearItemsDto,
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

@ApiTags('Bank Reconciliation')
@ApiBearerAuth()
@Controller('accounts/bank-reconciliation')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireModule('accounts')
export class BankReconciliationController {
  constructor(private readonly bankReconciliationService: BankReconciliationService) {}

  // ============================================================================
  // RECONCILIATION HEADER (static routes first, then :id param routes)
  // ============================================================================

  @Post()
  @ApiOperation({ summary: 'Create a new bank reconciliation' })
  @ApiResponse({ status: 201, description: 'Bank reconciliation created successfully' })
  @RequireFeature('accounts', 'accounts.bank_reconciliation')
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBankReconciliationDto,
  ) {
    return this.bankReconciliationService.create(user.companyId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bank reconciliations' })
  @ApiResponse({ status: 200, description: 'Paginated list of bank reconciliations' })
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: BankReconciliationQueryDto,
  ) {
    return this.bankReconciliationService.findAll(user.companyId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bank reconciliation by ID' })
  @ApiResponse({ status: 200, description: 'Bank reconciliation details' })
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.bankReconciliationService.findById(user.companyId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a bank reconciliation' })
  @ApiResponse({ status: 200, description: 'Bank reconciliation updated successfully' })
  @RequireFeature('accounts', 'accounts.bank_reconciliation')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBankReconciliationDto,
  ) {
    return this.bankReconciliationService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a bank reconciliation' })
  @ApiResponse({ status: 200, description: 'Bank reconciliation deleted successfully' })
  @RequireFeature('accounts', 'accounts.bank_reconciliation')
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.bankReconciliationService.remove(user.companyId, id);
    return { message: 'Bank reconciliation deleted successfully' };
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark a bank reconciliation as completed' })
  @ApiResponse({ status: 200, description: 'Bank reconciliation completed successfully' })
  @RequireFeature('accounts', 'accounts.bank_reconciliation')
  async complete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.bankReconciliationService.complete(user.companyId, id, user.id);
  }

  // ============================================================================
  // RECONCILIATION ITEMS
  // ============================================================================

  @Get(':id/items')
  @ApiOperation({ summary: 'Get all items for a bank reconciliation' })
  @ApiResponse({ status: 200, description: 'List of reconciliation items' })
  async findAllItems(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.bankReconciliationService.findAllItems(user.companyId, id);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add an item to a bank reconciliation' })
  @ApiResponse({ status: 201, description: 'Reconciliation item added successfully' })
  @RequireFeature('accounts', 'accounts.bank_reconciliation')
  async addItem(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateBankReconciliationItemDto,
  ) {
    return this.bankReconciliationService.addItem(user.companyId, id, dto);
  }

  @Put(':id/items/:itemId')
  @ApiOperation({ summary: 'Update a reconciliation item' })
  @ApiResponse({ status: 200, description: 'Reconciliation item updated successfully' })
  @RequireFeature('accounts', 'accounts.bank_reconciliation')
  async updateItem(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateBankReconciliationItemDto,
  ) {
    return this.bankReconciliationService.updateItem(user.companyId, id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Remove an item from a bank reconciliation' })
  @ApiResponse({ status: 200, description: 'Reconciliation item removed successfully' })
  @RequireFeature('accounts', 'accounts.bank_reconciliation')
  async removeItem(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    await this.bankReconciliationService.removeItem(user.companyId, id, itemId);
    return { message: 'Reconciliation item removed successfully' };
  }

  @Post(':id/items/bulk-clear')
  @ApiOperation({ summary: 'Mark multiple items as cleared in bulk' })
  @ApiResponse({ status: 200, description: 'Items cleared successfully' })
  @RequireFeature('accounts', 'accounts.bank_reconciliation')
  async bulkClearItems(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BulkClearItemsDto,
  ) {
    return this.bankReconciliationService.bulkClearItems(user.companyId, id, dto);
  }
}
