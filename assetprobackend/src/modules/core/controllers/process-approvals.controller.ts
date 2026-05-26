import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { FeatureGuard } from '../../../common/guards/feature.guard';
import { TenantOnly } from '../../../common/decorators/tenant.decorators';
import { RequireModule } from '../../../common/decorators/feature.decorators';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../../auth/decorators/current-user.decorator';
import { ProcessApprovalService } from '../services/process-approval.service';
import {
  InitiateApprovalDto,
  ApprovalActionDto,
  RejectApprovalDto,
  OverrideApprovalDto,
  ProcessApprovalQueryDto,
  ProcessApprovalListResponseDto,
  ProcessApprovalStatusResponseDto,
  PendingApprovalsResponseDto,
} from '../dto/process-approval.dto';

@ApiTags('Core - Process Approvals')
@ApiBearerAuth()
@Controller('core/approvals')
@UseGuards(JwtAuthGuard, TenantGuard, FeatureGuard)
@TenantOnly()
@RequireModule('core')
export class ProcessApprovalsController {
  constructor(private readonly approvalService: ProcessApprovalService) {}

  // ============================================================================
  // INITIATE APPROVAL (backend convention)
  // ============================================================================

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate approval process for a record' })
  @ApiResponse({
    status: 201,
    description: 'Approval process initiated',
    type: ProcessApprovalStatusResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid data or approval already exists' })
  @ApiResponse({ status: 404, description: 'No approval flow found for process type' })
  async initiateApproval(
    @Body() dto: InitiateApprovalDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ProcessApprovalStatusResponseDto> {
    return this.approvalService.initiateApproval(dto, user.id as number);
  }

  // ============================================================================
  // SUBMIT FOR APPROVAL (frontend convention - alias for initiate)
  // ============================================================================

  @Post('submit')
  @ApiOperation({ summary: 'Submit an entity for approval (frontend-friendly alias)' })
  @ApiResponse({
    status: 201,
    description: 'Approval process initiated',
    type: ProcessApprovalStatusResponseDto,
  })
  async submitForApproval(
    @Body() body: { entityType: string; entityId: number },
    @CurrentUser() user: CurrentUserData,
  ): Promise<ProcessApprovalStatusResponseDto> {
    const dto: InitiateApprovalDto = {
      processType: body.entityType,
      recordId: body.entityId,
      companyId: (user.companyId as number) || 0,
    };
    return this.approvalService.initiateApproval(dto, user.id as number);
  }

  // ============================================================================
  // APPROVE STEP
  // ============================================================================

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a specific approval step' })
  @ApiParam({ name: 'id', type: Number, description: 'Process approval ID' })
  @ApiResponse({
    status: 200,
    description: 'Approval step approved',
    type: ProcessApprovalStatusResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Approval already processed' })
  @ApiResponse({ status: 403, description: 'No permission to approve this step' })
  @ApiResponse({ status: 404, description: 'Approval not found' })
  async approveStep(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApprovalActionDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ProcessApprovalStatusResponseDto> {
    return this.approvalService.approveStep(id, user.id as number, dto);
  }

  // ============================================================================
  // REJECT STEP
  // ============================================================================

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a specific approval step' })
  @ApiParam({ name: 'id', type: Number, description: 'Process approval ID' })
  @ApiResponse({
    status: 200,
    description: 'Approval step rejected',
    type: ProcessApprovalStatusResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Approval already processed' })
  @ApiResponse({ status: 403, description: 'No permission to reject this step' })
  @ApiResponse({ status: 404, description: 'Approval not found' })
  async rejectStep(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectApprovalDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ProcessApprovalStatusResponseDto> {
    return this.approvalService.rejectStep(id, user.id as number, dto);
  }

  // ============================================================================
  // UNIFIED ACTION (frontend convention - dispatches to approve/reject)
  // ============================================================================

  @Post(':id/action')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perform an approval action (approve/reject/return)' })
  @ApiParam({ name: 'id', type: Number, description: 'Approval status ID' })
  @ApiResponse({
    status: 200,
    description: 'Action performed',
    type: ProcessApprovalStatusResponseDto,
  })
  async performAction(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { action: 'approve' | 'reject' | 'return'; comment?: string; signaturePath?: string },
    @CurrentUser() user: CurrentUserData,
  ): Promise<ProcessApprovalStatusResponseDto> {
    return this.approvalService.performAction(id, user.id as number, body.action, body.comment, body.signaturePath);
  }

  // ============================================================================
  // SUPER ADMIN APPROVE STEP
  // ============================================================================

  @Post(':id/super-admin-approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Super Admin: approve the current step and advance to the next' })
  @ApiParam({ name: 'id', type: Number, description: 'Approval status ID' })
  @ApiResponse({ status: 200, description: 'Step approved by Super Admin', type: ProcessApprovalStatusResponseDto })
  @ApiResponse({ status: 403, description: 'Not Super Admin' })
  async superAdminApproveStep(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ProcessApprovalStatusResponseDto> {
    return this.approvalService.superAdminApproveStep(id, user.id as number);
  }

  // ============================================================================
  // RESET TO STEP 1 (Super Admin)
  // ============================================================================

  @Post(':id/reset-to-step-1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Super Admin: reset the approval flow back to step 1' })
  @ApiParam({ name: 'id', type: Number, description: 'Approval status ID' })
  @ApiResponse({ status: 200, description: 'Approval reset to step 1', type: ProcessApprovalStatusResponseDto })
  @ApiResponse({ status: 403, description: 'Not Super Admin' })
  async resetToStep1(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ProcessApprovalStatusResponseDto> {
    return this.approvalService.resetToStep1(id, user.id as number);
  }

  // ============================================================================
  // CANCEL APPROVAL
  // ============================================================================

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending approval' })
  @ApiParam({ name: 'id', type: Number, description: 'Approval status ID' })
  @ApiResponse({ status: 200, description: 'Approval cancelled' })
  async cancelApproval(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
    @CurrentUser() user: CurrentUserData,
  ): Promise<void> {
    await this.approvalService.cancelApproval(id, user.id as number, body.reason);
  }

  // ============================================================================
  // OVERRIDE APPROVAL
  // ============================================================================

  @Post(':id/override')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Override the entire remaining approval flow from the current step' })
  @ApiParam({ name: 'id', type: Number, description: 'Approval status ID' })
  @ApiResponse({ status: 200, description: 'Approval overridden', type: ProcessApprovalStatusResponseDto })
  @ApiResponse({ status: 403, description: 'Not authorised to override or self-override attempt' })
  async overrideApproval(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: OverrideApprovalDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ProcessApprovalStatusResponseDto> {
    return this.approvalService.overrideApproval(id, user.id as number, dto);
  }

  // ============================================================================
  // MY PENDING INBOX (grouped, enriched)
  // ============================================================================

  @Get('my-pending')
  @ApiOperation({ summary: 'Get unified approvals inbox: pending items grouped by flow type, enriched with entity details' })
  @ApiResponse({ status: 200, description: 'Approvals inbox grouped by flow type' })
  async getMyPendingInbox(
    @CurrentUser() user: CurrentUserData,
    @Query('companyId') companyId?: number,
  ) {
    const cid = companyId || (user.companyId as number) || 0;
    return this.approvalService.getMyPendingInbox(user.id as number, cid);
  }

  // ============================================================================
  // GET PENDING APPROVALS
  // ============================================================================

  @Get('pending')
  @ApiOperation({ summary: 'Get pending approvals for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of pending approvals',
    type: PendingApprovalsResponseDto,
  })
  async getPendingApprovals(
    @CurrentUser() user: CurrentUserData,
    @Query('companyId') companyId?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('entityType') entityType?: string,
    @Query('scope') scope?: string,
  ): Promise<PendingApprovalsResponseDto> {
    const cid = companyId || (user.companyId as number) || 0;
    const safeScope: 'mine' | 'all' = scope === 'all' ? 'all' : 'mine';
    return this.approvalService.getPendingApprovals(
      user.id as number,
      cid,
      page || 1,
      limit || 20,
      entityType,
      safeScope,
    );
  }

  // ============================================================================
  // PENDING COUNT
  // ============================================================================

  @Get('pending/count')
  @ApiOperation({ summary: 'Get count of pending approvals for current user' })
  @ApiResponse({ status: 200, description: 'Count of pending approvals' })
  async getPendingCount(
    @CurrentUser() user: CurrentUserData,
    @Query('companyId') companyId?: number,
  ): Promise<{ count: number }> {
    const cid = companyId || (user.companyId as number) || 0;
    const count = await this.approvalService.getPendingCount(user.id as number, cid);
    return { count };
  }

  // ============================================================================
  // APPROVAL STATS
  // ============================================================================

  @Get('stats')
  @ApiOperation({ summary: 'Get approval statistics' })
  @ApiResponse({ status: 200, description: 'Approval statistics' })
  async getStats(
    @CurrentUser() user: CurrentUserData,
    @Query('companyId') companyId?: number,
  ): Promise<Record<string, unknown>> {
    const cid = companyId || (user.companyId as number) || 0;
    return this.approvalService.getStats(cid);
  }

  // ============================================================================
  // RESOLVE ENTITY URL FROM APPROVAL ID
  // ============================================================================

  @Get('resolve/:approvableId')
  @ApiOperation({ summary: 'Resolve an approvable entity ID to its detail URL' })
  async resolveEntityUrl(
    @CurrentUser() user: CurrentUserData,
    @Param('approvableId', ParseIntPipe) approvableId: number,
  ): Promise<{ url: string | null }> {
    const urlMap: Record<string, string> = {
      expense_requests: '/accounts/expense-requests',
      sales_orders: '/sales/orders',
      sales_invoices: '/sales/invoices',
      purchase_requisitions: '/purchase/requisitions',
      purchase_orders: '/purchase/orders',
      purchase_invoices: '/purchase/invoices',
      customer_receipts: '/receivables/receipts',
      StockMovement: '/inventory/stock-movements',
      supplier_payments: '/payables/payments',
      bank_transfers: '/accounts/bank-transfers',
    };

    // Find any approval status record with this approvableId
    const record = await this.approvalService.findByApprovableId(approvableId, user.companyId || 0);
    if (!record) return { url: null };

    const base = urlMap[record.approvableType] || null;
    return { url: base ? `${base}?view=${approvableId}` : null };
  }

  // ============================================================================
  // CHECK APPROVAL STATUS
  // ============================================================================

  @Get('status/:processType/:recordId')
  @ApiOperation({ summary: 'Check approval status for a specific record' })
  @ApiParam({ name: 'processType', type: String, description: 'Process type (e.g., purchase_requisitions)' })
  @ApiParam({ name: 'recordId', type: Number, description: 'Record ID' })
  @ApiResponse({
    status: 200,
    description: 'Approval status',
    type: ProcessApprovalStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Approval status not found' })
  async checkApprovalStatus(
    @Param('processType') processType: string,
    @Param('recordId', ParseIntPipe) recordId: number,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ProcessApprovalStatusResponseDto> {
    return this.approvalService.checkApprovalStatus(processType, recordId, user.id as number);
  }

  // ============================================================================
  // APPROVAL HISTORY FOR ENTITY
  // ============================================================================

  @Get('history/:entityType/:entityId')
  @ApiOperation({ summary: 'Get approval history for a specific entity' })
  @ApiParam({ name: 'entityType', type: String })
  @ApiParam({ name: 'entityId', type: Number })
  @ApiResponse({ status: 200, description: 'Approval history for entity' })
  async getHistoryForEntity(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseIntPipe) entityId: number,
  ): Promise<ProcessApprovalStatusResponseDto[]> {
    return this.approvalService.getHistoryForEntity(entityType, entityId);
  }

  // ============================================================================
  // ALL APPROVAL HISTORY (paginated)
  // ============================================================================

  @Get('history')
  @ApiOperation({ summary: 'Get all approval history with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated approval history' })
  async getAllHistory(
    @Query() query: { page?: number; limit?: number; entityType?: string; status?: string; dateFrom?: string; dateTo?: string },
  ) {
    return this.approvalService.getAllHistory(query);
  }

  // ============================================================================
  // LIST APPROVALS
  // ============================================================================

  @Get()
  @ApiOperation({ summary: 'Get list of approvals with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'approvableType', required: false, type: String })
  @ApiQuery({ name: 'approvableId', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of approvals',
    type: ProcessApprovalListResponseDto,
  })
  async findAll(
    @Query() query: ProcessApprovalQueryDto,
  ): Promise<ProcessApprovalListResponseDto> {
    return this.approvalService.findAll(query);
  }
}
