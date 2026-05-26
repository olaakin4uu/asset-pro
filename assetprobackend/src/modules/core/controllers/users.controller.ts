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
  Req,
  ForbiddenException,
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
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { FeatureGuard } from '../../../common/guards/feature.guard';
import { TenantOnly, CurrentTenant, TenantContext } from '../../../common/decorators/tenant.decorators';
import { RequireModule } from '../../../common/decorators/feature.decorators';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../../auth/decorators/current-user.decorator';
import { UsersService } from '../services/users.service';
import { QuotaGuard, CheckQuota } from '../../../common/guards/quota.guard';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangeUserPasswordDto,
  UserListQueryDto,
  UserResponseDto,
  UserListResponseDto,
  AssignRolesDto,
  ImportUsersDto,
} from '../dto';

@ApiTags('Core - Users')
@ApiBearerAuth()
@Controller('core/users')
@UseGuards(JwtAuthGuard, TenantGuard, FeatureGuard, PermissionsGuard)
@TenantOnly()
@RequireModule('core')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ============================================================================
  // CREATE USER
  // ============================================================================
  @Post()
  @RequirePermission('create users')
  @UseGuards(QuotaGuard)
  @CheckQuota('users')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<UserResponseDto> {
    return this.usersService.create(dto, user.id as number);
  }

  // ============================================================================
  // EMPLOYEE LOOKUP — no permission guard, used by bank auth, approvals, etc.
  // ============================================================================
  @Get('employees/lookup')
  @ApiOperation({ summary: 'Tenant-wide employee list for comboboxes (no module/permission gate)' })
  @ApiResponse({ status: 200, description: 'Array of {id, fullName, employeeCode, companyId}' })
  async employeeLookup(): Promise<{ id: number; fullName: string; employeeCode: string; companyId: number }[]> {
    return this.usersService.employeeLookup();
  }

  // ============================================================================
  // LIST USERS
  // ============================================================================
  @Get()
  @RequirePermission('view users')
  @ApiOperation({ summary: 'Get all users with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of users', type: UserListResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({ name: 'userType', required: false, enum: ['EMPLOYEE', 'ADMIN', 'SYSTEM', 'EXTERNAL'] })
  async findAll(@Query() query: UserListQueryDto): Promise<UserListResponseDto> {
    return this.usersService.findAll(query);
  }

  // ============================================================================
  // SEAT INFO — must be before /:id routes
  // ============================================================================
  @Get('seat-info')
  @ApiOperation({ summary: 'Get user seat usage for current subscription' })
  @ApiResponse({ status: 200, description: 'Seat usage info' })
  async getSeatInfo(
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ used: number; max: number; available: number; planName: string }> {
    return this.usersService.getSeatInfo(user.tenantId!);
  }

  // ============================================================================
  // IMPORT TEMPLATE — must be before /:id routes
  // ============================================================================
  @Get('import/template')
  @ApiOperation({ summary: 'Get user import CSV template' })
  @ApiResponse({ status: 200, description: 'Template headers, sample rows, and field notes' })
  getUserImportTemplate(): { headers: string[]; sampleRows: string[][]; notes: Record<string, string> } {
    return this.usersService.getUserImportTemplate();
  }

  // ============================================================================
  // IMPORT USERS
  // ============================================================================
  @Post('import')
  @UseGuards(PermissionsGuard)
  @RequirePermission('import users')
  @ApiOperation({ summary: 'Bulk import users from structured data' })
  @ApiResponse({ status: 201, description: 'Import result' })
  async importUsers(
    @Body() dto: ImportUsersDto,
    @CurrentUser() user: CurrentUserData,
    @Req() req: any,
  ): Promise<{
    imported: number;
    updated: number;
    skipped: number;
    errors: { row: number; email: string; message: string }[];
    tempPasswords: Record<string, string>;
    seatsUsed: number;
    seatsMax: number;
  }> {
    if (dto.importMode === 'overwrite') {
      const userPermissions: Set<string> | undefined = req._userPermissions;
      if (userPermissions && !userPermissions.has('import-overwrite users') && !userPermissions.has('manage all records')) {
        throw new ForbiddenException('You do not have permission to use overwrite import mode. Contact your administrator.');
      }
    }
    return this.usersService.importUsers(user.tenantId!, dto, user.id as number, user.companyId as number | undefined);
  }

  // ============================================================================
  // GET USER BY ID
  // ============================================================================
  @Get(':id')
  @RequirePermission('view users')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'User details', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  // ============================================================================
  // UPDATE USER
  // ============================================================================
  @Patch(':id')
  @RequirePermission('edit users')
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'User updated', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto, user.id as number);
  }

  // ============================================================================
  // CHANGE USER PASSWORD
  // ============================================================================
  @Post(':id/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password (admin action)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeUserPasswordDto,
  ): Promise<{ message: string }> {
    await this.usersService.changePassword(id, dto);
    return { message: 'Password changed successfully' };
  }

  // ============================================================================
  // DELETE USER
  // ============================================================================
  @Delete(':id')
  @RequirePermission('delete users')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserData,
  ): Promise<void> {
    await this.usersService.remove(id, user.id as number);
  }

  // ============================================================================
  // ASSIGN ROLES
  // ============================================================================
  @Post(':id/roles')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign roles to user' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Roles assigned' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async assignRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignRolesDto,
  ): Promise<{ message: string }> {
    await this.usersService.assignRoles(id, dto);
    return { message: 'Roles assigned successfully' };
  }

  // ============================================================================
  // GET USER ROLES
  // ============================================================================
  @Get(':id/roles')
  @ApiOperation({ summary: 'Get user roles' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'User roles', type: [String] })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserRoles(@Param('id', ParseIntPipe) id: number): Promise<string[]> {
    return this.usersService.getUserRoles(id);
  }

  // ============================================================================
  // GET USER PERMISSIONS
  // ============================================================================
  @Get(':id/permissions')
  @ApiOperation({ summary: 'Get user permissions (from all roles)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'User permissions', type: [String] })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserPermissions(@Param('id', ParseIntPipe) id: number): Promise<string[]> {
    return this.usersService.getUserPermissions(id);
  }

  // ============================================================================
  // CHECK USER PERMISSION
  // ============================================================================
  @Get(':id/permissions/:permission')
  @ApiOperation({ summary: 'Check if user has a specific permission' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'permission', type: String })
  @ApiResponse({ status: 200, description: 'Permission check result' })
  async hasPermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('permission') permission: string,
  ): Promise<{ hasPermission: boolean }> {
    const has = await this.usersService.hasPermission(id, permission);
    return { hasPermission: has };
  }

  // ============================================================================
  // INVITE USER
  // ============================================================================
  @Post('invite')
  @RequirePermission('create users')
  @ApiOperation({ summary: 'Send invite email to a new user' })
  @ApiResponse({ status: 201, description: 'Invitation sent' })
  async inviteUser(
    @Body() dto: { email: string; name: string; userType?: string; branchId?: number },
    @CurrentUser() user: CurrentUserData,
    @Req() req: any,
  ): Promise<{ message: string }> {
    const tenantSlug = user.tenantSlug ?? req.tenantSlug ?? '';
    return this.usersService.inviteUser(
      { ...dto, companyId: user.companyId as number },
      user.id as number,
      tenantSlug,
      '',
    );
  }
}
