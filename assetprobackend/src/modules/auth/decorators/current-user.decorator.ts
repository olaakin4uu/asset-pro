import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserData {
  id: number | string;
  email: string;
  role: string;
  tenantId?: string;
  tenantSlug?: string;
  userType?: string;
  companyId?: number;
  branchId?: number;
  employeeId?: number;
  customerId?: number;
  supplierId?: number;
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserData;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
