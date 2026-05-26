import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { superAdminOverrideApproval, OVERRIDE_REGISTRY } from '../../../common/utils/super-admin';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

@ApiTags('Core - Super Admin Override')
@ApiBearerAuth()
@Controller('core/super-admin-override')
@UseGuards(JwtAuthGuard)
export class SuperAdminOverrideController {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Override all pending approvals for any entity (Super Admin only)' })
  async override(
    @CurrentUser() user: AuthUser,
    @Body() dto: { entityType: string; entityId: number; reason: string },
  ) {
    return superAdminOverrideApproval(this.tenantPrisma, user.id, {
      entityType: dto.entityType,
      entityId: dto.entityId,
      companyId: user.companyId,
      reason: dto.reason,
    });
  }

  @Post('entity-types')
  @ApiOperation({ summary: 'List all entity types that support Super Admin override' })
  async listEntityTypes() {
    return Object.keys(OVERRIDE_REGISTRY).map((key) => ({
      entityType: key,
      table: OVERRIDE_REGISTRY[key].table,
      approvedStatus: OVERRIDE_REGISTRY[key].approvedStatus,
    }));
  }
}
