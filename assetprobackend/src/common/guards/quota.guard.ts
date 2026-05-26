import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantPrismaService } from '../services/tenant-prisma.service';

export const QUOTA_KEY = 'quota_type';
export const CheckQuota = (type: 'users' | 'companies' | 'branches') =>
  (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(QUOTA_KEY, type, descriptor.value);
    return descriptor;
  };

@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private tenantPrisma: TenantPrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const quotaType = this.reflector.get<string>(QUOTA_KEY, context.getHandler());
    if (!quotaType) return true;

    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;
    if (!tenantId) return true;

    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId, status: { in: ['active', 'trial'] } },
      include: { plan: true },
    });
    if (!subscription?.plan) return true; // No plan = no limits

    const plan = subscription.plan;

    if (quotaType === 'users') {
      const maxUsers = plan.maxUsers ?? 999999;
      const result = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM users WHERE "userType" = 'EMPLOYEE' AND "deletedAt" IS NULL`, [],
      );
      const currentUsers = parseInt(result?.count || '0', 10);
      if (currentUsers >= maxUsers) {
        throw new ForbiddenException(
          `User limit reached (${currentUsers}/${maxUsers}). Upgrade your ${plan.name} plan to add more users.`,
        );
      }
    }

    if (quotaType === 'companies') {
      const maxCompanies = plan.maxCompanies ?? 999999;
      const result = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM companies WHERE "deletedAt" IS NULL`, [],
      );
      const currentCompanies = parseInt(result?.count || '0', 10);
      if (currentCompanies >= maxCompanies) {
        throw new ForbiddenException(
          `Company limit reached (${currentCompanies}/${maxCompanies}). Upgrade your ${plan.name} plan to add more companies.`,
        );
      }
    }

    if (quotaType === 'branches') {
      const maxBranches = plan.maxBranches ?? 999999;
      const result = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM branches WHERE "deletedAt" IS NULL`, [],
      );
      const currentBranches = parseInt(result?.count || '0', 10);
      if (currentBranches >= maxBranches) {
        throw new ForbiddenException(
          `Branch limit reached (${currentBranches}/${maxBranches}). Upgrade your ${plan.name} plan to add more branches.`,
        );
      }
    }

    return true;
  }
}
