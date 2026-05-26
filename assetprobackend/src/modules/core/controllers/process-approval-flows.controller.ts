import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { ProcessApprovalFlowService } from '../services/process-approval-flow.service';
import {
  CreateProcessApprovalFlowDto,
  UpdateProcessApprovalFlowDto,
  ProcessApprovalFlowQueryDto,
  ProcessApprovalFlowResponseDto,
  ProcessApprovalFlowListResponseDto,
  CreateProcessApprovalFlowStepDto,
  UpdateProcessApprovalFlowStepDto,
  ProcessApprovalFlowStepResponseDto,
  ApprovalFlowStatsResponseDto,
  ReorderStepsDto,
} from '../dto/process-approval-flow.dto';

@ApiTags('Core - Approval Flows')
@ApiBearerAuth()
@Controller('core/approval-flows')
@UseGuards(JwtAuthGuard, TenantGuard, FeatureGuard)
@TenantOnly()
@RequireModule('core')
export class ProcessApprovalFlowsController {
  constructor(private readonly flowService: ProcessApprovalFlowService) {}

  // ============================================================================
  // APPROVAL FLOW ENDPOINTS
  // ============================================================================

  @Post()
  @ApiOperation({ summary: 'Create a new approval flow' })
  @ApiResponse({
    status: 201,
    description: 'Approval flow created',
    type: ProcessApprovalFlowResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async createFlow(
    @Body() dto: CreateProcessApprovalFlowDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ProcessApprovalFlowResponseDto> {
    return this.flowService.createFlow(dto, user.id as number, user.companyId as number);
  }

  @Get()
  @ApiOperation({ summary: 'Get all approval flows with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'List of approval flows',
    type: ProcessApprovalFlowListResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'approvableType', required: false, type: String })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  async findAllFlows(
    @Query() query: ProcessApprovalFlowQueryDto,
  ): Promise<ProcessApprovalFlowListResponseDto> {
    return this.flowService.findAllFlows(query);
  }

  // --- SPECIFIC ROUTES MUST COME BEFORE :id ---

  @Get('stats')
  @ApiOperation({ summary: 'Get approval flow statistics' })
  @ApiResponse({ status: 200, type: ApprovalFlowStatsResponseDto })
  async getStats(): Promise<ApprovalFlowStatsResponseDto> {
    return this.flowService.getStats();
  }

  @Get('process/:processType/company/:companyId')
  @ApiOperation({ summary: 'Get approval flow for a specific process type and company' })
  @ApiParam({ name: 'processType', type: String })
  @ApiParam({ name: 'companyId', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Approval flow for process',
    type: ProcessApprovalFlowResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No approval flow found' })
  async getFlowForProcess(
    @Param('processType') processType: string,
    @Param('companyId', ParseIntPipe) companyId: number,
  ): Promise<ProcessApprovalFlowResponseDto | null> {
    return this.flowService.getFlowForProcess(processType, companyId);
  }

  // --- PARAMETERIZED :id ROUTES ---

  @Get(':id')
  @ApiOperation({ summary: 'Get approval flow by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Approval flow details',
    type: ProcessApprovalFlowResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Approval flow not found' })
  async findOneFlow(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProcessApprovalFlowResponseDto> {
    return this.flowService.findOneFlow(id, true);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update approval flow (partial)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Approval flow updated',
    type: ProcessApprovalFlowResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Approval flow not found' })
  async updateFlow(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProcessApprovalFlowDto,
  ): Promise<ProcessApprovalFlowResponseDto> {
    return this.flowService.updateFlow(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete approval flow' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Approval flow deleted' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete flow with active approvals',
  })
  @ApiResponse({ status: 404, description: 'Approval flow not found' })
  async removeFlow(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.flowService.removeFlow(id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate an approval flow with its steps' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 201,
    description: 'Approval flow duplicated',
    type: ProcessApprovalFlowResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Approval flow not found' })
  async duplicateFlow(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ProcessApprovalFlowResponseDto> {
    return this.flowService.duplicateFlow(id, user.id as number);
  }

  @Post(':id/set-default')
  @ApiOperation({ summary: 'Set this flow as the default for its entity type' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Approval flow set as default',
    type: ProcessApprovalFlowResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Approval flow not found' })
  async setDefaultFlow(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProcessApprovalFlowResponseDto> {
    return this.flowService.setDefaultFlow(id);
  }

  // ============================================================================
  // APPROVAL FLOW STEP ENDPOINTS
  // ============================================================================

  @Post(':id/steps')
  @ApiOperation({ summary: 'Add a step to an approval flow' })
  @ApiParam({ name: 'id', type: Number, description: 'Approval flow ID' })
  @ApiResponse({
    status: 201,
    description: 'Approval flow step created',
    type: ProcessApprovalFlowStepResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Approval flow not found' })
  async createStep(
    @Param('id', ParseIntPipe) flowId: number,
    @Body() dto: CreateProcessApprovalFlowStepDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ProcessApprovalFlowStepResponseDto> {
    dto.processApprovalFlowId = flowId;
    return this.flowService.createStep(dto, user.companyId as number);
  }

  @Post(':id/steps/reorder')
  @ApiOperation({ summary: 'Reorder steps within an approval flow' })
  @ApiParam({ name: 'id', type: Number, description: 'Approval flow ID' })
  @ApiResponse({
    status: 200,
    description: 'Steps reordered',
    type: [ProcessApprovalFlowStepResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Approval flow not found' })
  async reorderSteps(
    @Param('id', ParseIntPipe) flowId: number,
    @Body() dto: ReorderStepsDto,
  ): Promise<ProcessApprovalFlowStepResponseDto[]> {
    return this.flowService.reorderSteps(flowId, dto.steps);
  }

  @Get(':id/steps')
  @ApiOperation({ summary: 'Get all steps for an approval flow' })
  @ApiParam({ name: 'id', type: Number, description: 'Approval flow ID' })
  @ApiResponse({
    status: 200,
    description: 'List of approval flow steps',
    type: [ProcessApprovalFlowStepResponseDto],
  })
  async findStepsByFlowId(
    @Param('id', ParseIntPipe) flowId: number,
  ): Promise<ProcessApprovalFlowStepResponseDto[]> {
    return this.flowService.findStepsByFlowId(flowId);
  }

  @Get(':flowId/steps/:stepId')
  @ApiOperation({ summary: 'Get a specific approval flow step' })
  @ApiParam({ name: 'flowId', type: Number, description: 'Approval flow ID' })
  @ApiParam({ name: 'stepId', type: Number, description: 'Approval flow step ID' })
  @ApiResponse({
    status: 200,
    description: 'Approval flow step details',
    type: ProcessApprovalFlowStepResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Approval flow step not found' })
  async findOneStep(
    @Param('stepId', ParseIntPipe) stepId: number,
  ): Promise<ProcessApprovalFlowStepResponseDto> {
    return this.flowService.findOneStep(stepId);
  }

  @Patch(':flowId/steps/:stepId')
  @ApiOperation({ summary: 'Update an approval flow step (partial)' })
  @ApiParam({ name: 'flowId', type: Number, description: 'Approval flow ID' })
  @ApiParam({ name: 'stepId', type: Number, description: 'Approval flow step ID' })
  @ApiResponse({
    status: 200,
    description: 'Approval flow step updated',
    type: ProcessApprovalFlowStepResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Approval flow step not found' })
  async updateStep(
    @Param('flowId', ParseIntPipe) flowId: number,
    @Param('stepId', ParseIntPipe) stepId: number,
    @Body() dto: UpdateProcessApprovalFlowStepDto,
  ): Promise<ProcessApprovalFlowStepResponseDto> {
    return this.flowService.updateStep(flowId, stepId, dto);
  }

  @Delete(':flowId/steps/:stepId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an approval flow step' })
  @ApiParam({ name: 'flowId', type: Number, description: 'Approval flow ID' })
  @ApiParam({ name: 'stepId', type: Number, description: 'Approval flow step ID' })
  @ApiResponse({ status: 204, description: 'Approval flow step deleted' })
  @ApiResponse({ status: 404, description: 'Approval flow step not found' })
  async removeStep(
    @Param('flowId', ParseIntPipe) flowId: number,
    @Param('stepId', ParseIntPipe) stepId: number,
  ): Promise<void> {
    await this.flowService.removeStep(flowId, stepId);
  }
}
