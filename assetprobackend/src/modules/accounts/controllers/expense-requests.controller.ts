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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { FeatureGuard } from '../../../common/guards/feature.guard';
import { RequireModule } from '../../../common/decorators/feature.decorators';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ExpenseRequestService } from '../services/expense-request.service';
import { TransferRequestService } from '../services/transfer-request.service';
import { BatchImportService } from '../services/batch-import.service';
import {
  CreateExpenseRequestDto,
  UpdateExpenseRequestDto,
  ApproveExpenseRequestDto,
  RejectExpenseRequestDto,
  PayExpenseRequestDto,
  ExpenseRequestQueryDto,
  AddAttachmentDto,
} from '../dto/expense-request.dto';
import { BatchImportDto, HistoricalLoadDto } from '../dto/batch-import.dto';

interface AuthUser {
  id: number;
  companyId: number;
  tenantId: string;
}

@ApiTags('Expense Requests')
@Controller('accounts/expense-requests')
@UseGuards(JwtAuthGuard, FeatureGuard, PermissionsGuard)
@RequireModule('accounts')
@ApiBearerAuth()
export class ExpenseRequestsController {
  constructor(
    private readonly expenseRequestService: ExpenseRequestService,
    private readonly transferRequestService: TransferRequestService,
    private readonly batchImportService: BatchImportService,
  ) {}

  @Post()
  @RequirePermission('create expense-requests')
  @ApiOperation({ summary: 'Create a new expense request' })
  @ApiResponse({ status: 201, description: 'Expense request created successfully' })
  async create(
    @Body() dto: CreateExpenseRequestDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.expenseRequestService.create(user.companyId, dto);
  }

  @Get()
  @RequirePermission('view expense-requests')
  @ApiOperation({ summary: 'Get all expense requests' })
  @ApiResponse({ status: 200, description: 'Expense requests retrieved successfully' })
  async findAll(
    @Query() query: ExpenseRequestQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.expenseRequestService.findAll(user.companyId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get expense request statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@CurrentUser() user: AuthUser) {
    return this.expenseRequestService.getStats(user.companyId);
  }

  // =========================================================================
  // BATCH IMPORT — live (goes through approval if configured)
  // =========================================================================

  @Post('batch/dry-run')
  @RequirePermission('create expense-requests')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a batch of expense requests without committing' })
  @ApiResponse({ status: 200, description: 'Per-group validation results' })
  async batchDryRun(
    @Body() dto: BatchImportDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.batchImportService.liveBatchDryRun(user.companyId, dto);
  }

  @Post('batch/commit')
  @RequirePermission('create expense-requests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Commit a batch — creates each group through the normal create/submit path' })
  @ApiResponse({ status: 201, description: 'Batch committed; per-group success/failure report' })
  async batchCommit(
    @Body() dto: BatchImportDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.batchImportService.liveBatchCommit(user.companyId, dto, user.id);
  }

  // =========================================================================
  // HISTORICAL LOAD — Super Admin only; bypasses approval, posts JE with
  // the row's own paymentDate so prior-period reports tie out.
  // =========================================================================

  @Post('historical/dry-run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a historical-load batch (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Per-group validation results' })
  @ApiResponse({ status: 403, description: 'Caller is not a Super Admin' })
  async historicalDryRun(
    @Body() dto: HistoricalLoadDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.batchImportService.historicalLoadDryRun(user.companyId, dto, user.id);
  }

  @Post('historical/commit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Commit a historical load — creates + posts paid + writes GL entries dated to each row\'s paymentDate (Super Admin only)',
  })
  @ApiResponse({ status: 201, description: 'Historical load committed; per-group success/failure report' })
  @ApiResponse({ status: 403, description: 'Caller is not a Super Admin' })
  async historicalCommit(
    @Body() dto: HistoricalLoadDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.batchImportService.historicalLoadCommit(user.companyId, dto, user.id);
  }

  @Get(':id')
  @RequirePermission('view expense-requests')
  @ApiOperation({ summary: 'Get expense request by ID' })
  @ApiResponse({ status: 200, description: 'Expense request retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Expense request not found' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.expenseRequestService.findById(user.companyId, id);
  }

  @Put(':id')
  @RequirePermission('edit expense-requests')
  @ApiOperation({ summary: 'Update expense request' })
  @ApiResponse({ status: 200, description: 'Expense request updated successfully' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseRequestDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.expenseRequestService.update(user.companyId, id, dto, user.id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit expense request for approval (or auto-approve if approval is disabled)' })
  @ApiResponse({ status: 200, description: 'Expense request submitted successfully' })
  @ApiResponse({ status: 400, description: 'Request not in draft status, or no flow configured' })
  async submit(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.expenseRequestService.submit(user.companyId, id, user.id);
  }

  @Post(':id/approve')
  @RequirePermission('approve expense-requests')
  @ApiOperation({ summary: 'Approve current approval step (handles all step types including accountant)' })
  @ApiResponse({ status: 200, description: 'Step approved successfully' })
  @ApiResponse({ status: 400, description: 'Request not pending or no pending step' })
  @ApiResponse({ status: 403, description: 'Not authorized to approve this step' })
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveExpenseRequestDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.expenseRequestService.approve(user.companyId, id, dto, user.id);
  }

  @Post(':id/reject')
  @RequirePermission('approve expense-requests')
  @ApiOperation({ summary: 'Reject current approval step' })
  @ApiResponse({ status: 200, description: 'Expense request rejected successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to reject this step' })
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectExpenseRequestDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.expenseRequestService.reject(user.companyId, id, dto, user.id);
  }

  @Post(':id/pay')
  @RequirePermission('approve expense-requests')
  @ApiOperation({ summary: 'Mark expense request as paid and post journal entry' })
  @ApiResponse({ status: 200, description: 'Expense request marked as paid' })
  @ApiResponse({ status: 400, description: 'Request not in approved status' })
  async markAsPaid(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PayExpenseRequestDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.expenseRequestService.markAsPaid(user.companyId, id, dto, user.id);
  }

  @Post(':id/process-payment')
  @RequirePermission('approve expense-requests')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve final step + create GL entries + mark as paid (single click)' })
  @ApiResponse({ status: 200, description: 'Payment processed, journal entry posted' })
  async processPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PayExpenseRequestDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.expenseRequestService.processPaymentAndApprove(user.companyId, id, dto, user.id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel expense request' })
  @ApiResponse({ status: 200, description: 'Request cancelled' })
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.expenseRequestService.cancelRequest(user.companyId, id, user.id);
  }

  @Post(':id/save-coding')
  @RequirePermission('approve expense-requests')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save GL account and WHT coding on expense request lines (accountant step only)' })
  @ApiResponse({ status: 200, description: 'Line coding saved' })
  @ApiResponse({ status: 400, description: 'Request not at coding stage' })
  async saveLineCoding(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { lines: Array<{ lineId: number; accountId?: number; whtId?: number | null; whtApplicable?: boolean }> },
    @CurrentUser() user: AuthUser,
  ) {
    return this.expenseRequestService.saveLineCoding(user.companyId, id, body.lines);
  }

  @Post(':id/reset-approval')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Super Admin: reset expense request approval back to step 1' })
  @ApiResponse({ status: 200, description: 'Approval reset to step 1' })
  @ApiResponse({ status: 403, description: 'Not Super Admin' })
  @ApiResponse({ status: 404, description: 'Request or approval record not found' })
  async resetApproval(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.expenseRequestService.resetApproval(user.companyId, id, user.id);
    return { success: true };
  }

  @Post(':id/resubmit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resubmit a rejected expense request' })
  @ApiResponse({ status: 200, description: 'Request resubmitted' })
  async resubmit(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.expenseRequestService.resubmit(user.companyId, id, user.id);
    return { success: true };
  }

  // ============================================================================
  // ATTACHMENTS
  // ============================================================================

  @Post(':id/attachments')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('create expense-requests')
  @ApiOperation({ summary: 'Attach a document to an expense request' })
  async addAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddAttachmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.expenseRequestService.addAttachment(user.companyId, id, dto, user.id);
  }

  @Delete(':id/attachments/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('create expense-requests')
  @ApiOperation({ summary: 'Remove a document attachment from an expense request' })
  async removeAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.expenseRequestService.removeAttachment(user.companyId, id, attachmentId);
  }

  @Delete(':id')
  @RequirePermission('delete expense-requests')
  @ApiOperation({ summary: 'Delete expense request' })
  @ApiResponse({ status: 200, description: 'Expense request deleted successfully' })
  @ApiResponse({ status: 400, description: 'Request not in draft status' })
  @ApiResponse({ status: 404, description: 'Expense request not found' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.expenseRequestService.delete(user.companyId, id);
    return { success: true };
  }
}
