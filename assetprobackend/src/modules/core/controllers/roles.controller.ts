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
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { FeatureGuard } from '../../../common/guards/feature.guard';
import { TenantOnly } from '../../../common/decorators/tenant.decorators';
import { RequireModule } from '../../../common/decorators/feature.decorators';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../../auth/decorators/current-user.decorator';
import { RolesService } from '../services/roles.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  RoleListQueryDto,
  RoleResponseDto,
  RoleListResponseDto,
  AssignPermissionsToRoleDto,
  PermissionResponseDto,
  PermissionListQueryDto,
  PermissionListResponseDto,
  GroupedPermissionsResponseDto,
} from '../dto';

@ApiTags('Core - Roles & Permissions')
@ApiBearerAuth()
@Controller('core')
@UseGuards(JwtAuthGuard, TenantGuard, FeatureGuard, PermissionsGuard)
@TenantOnly()
@RequireModule('core')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // ============================================================================
  // ROLES
  // ============================================================================

  @Post('roles')
  @RequirePermission('create roles')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created', type: RoleResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  async createRole(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<RoleResponseDto> {
    return this.rolesService.create(dto, user.id as number);
  }

  @Get('roles')
  @RequirePermission('view roles')
  @ApiOperation({ summary: 'Get all roles with pagination' })
  @ApiResponse({ status: 200, description: 'List of roles', type: RoleListResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'includePermissions', required: false, type: Boolean })
  async findAllRoles(@Query() query: RoleListQueryDto): Promise<RoleListResponseDto> {
    return this.rolesService.findAll(query);
  }

  @Get('roles/:id')
  @RequirePermission('view roles')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Role details', type: RoleResponseDto })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findOneRole(@Param('id', ParseIntPipe) id: number): Promise<RoleResponseDto> {
    return this.rolesService.findOne(id);
  }

  @Patch('roles/:id')
  @RequirePermission('edit roles')
  @ApiOperation({ summary: 'Update role' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Role updated', type: RoleResponseDto })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<RoleResponseDto> {
    return this.rolesService.update(id, dto, user.id as number);
  }

  @Delete('roles/:id')
  @RequirePermission('delete roles')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete role' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Role deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete system role or role with users' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async removeRole(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserData,
  ): Promise<void> {
    await this.rolesService.remove(id, user.id as number);
  }

  @Post('roles/:id/permissions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign permissions to role' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Permissions assigned' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async assignPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignPermissionsToRoleDto,
  ): Promise<{ message: string }> {
    await this.rolesService.assignPermissions(id, dto);
    return { message: 'Permissions assigned successfully' };
  }

  @Get('roles/:id/permissions')
  @ApiOperation({ summary: 'Get role permissions' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Role permissions', type: [PermissionResponseDto] })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async getRolePermissions(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PermissionResponseDto[]> {
    return this.rolesService.getRolePermissions(id);
  }

  // ============================================================================
  // PERMISSIONS
  // ============================================================================

  @Get('permissions')
  @ApiOperation({ summary: 'Get all permissions' })
  @ApiResponse({ status: 200, description: 'List of permissions' })
  @ApiQuery({ name: 'module', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'groupByModule', required: false, type: Boolean })
  async findAllPermissions(
    @Query() query: PermissionListQueryDto,
  ): Promise<PermissionListResponseDto | GroupedPermissionsResponseDto> {
    return this.rolesService.findAllPermissions(query);
  }

  @Get('permissions/modules')
  @ApiOperation({ summary: 'Get all permission modules' })
  @ApiResponse({ status: 200, description: 'List of modules', type: [String] })
  async getPermissionModules(): Promise<string[]> {
    return this.rolesService.getPermissionModules();
  }

  @Get('permissions/:id')
  @ApiOperation({ summary: 'Get permission by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Permission details', type: PermissionResponseDto })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  async findOnePermission(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PermissionResponseDto> {
    return this.rolesService.findOnePermission(id);
  }
}
