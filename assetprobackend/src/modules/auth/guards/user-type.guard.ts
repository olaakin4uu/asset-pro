import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserTypeEnum } from '../dto';
import { AuthUser } from '../strategies/jwt.strategy';

export const USER_TYPE_KEY = 'userTypes';

/**
 * Decorator to specify allowed user types for an endpoint
 * @example @AllowedUserTypes(UserTypeEnum.EMPLOYEE, UserTypeEnum.ADMIN)
 */
export const AllowedUserTypes = (...types: UserTypeEnum[]) =>
  Reflect.metadata(USER_TYPE_KEY, types);

/**
 * Guard that restricts access based on user type
 * Use with @AllowedUserTypes decorator
 */
@Injectable()
export class UserTypeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedTypes = this.reflector.getAllAndOverride<UserTypeEnum[]>(
      USER_TYPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no user types specified, allow all authenticated users
    if (!allowedTypes || allowedTypes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Central admin users (those without userType) bypass this check
    if (!user.userType) {
      return true;
    }

    const hasAccess = allowedTypes.includes(user.userType as UserTypeEnum);

    if (!hasAccess) {
      throw new ForbiddenException(
        `Access denied. This endpoint is restricted to: ${allowedTypes.join(', ')}`,
      );
    }

    return true;
  }
}

/**
 * Convenience decorators for common user type restrictions
 */

// Employee-only endpoints (internal ERP access)
export const EmployeeOnly = () =>
  AllowedUserTypes(UserTypeEnum.EMPLOYEE, UserTypeEnum.ADMIN, UserTypeEnum.SYSTEM);

// Customer portal endpoints
export const CustomerPortalOnly = () => AllowedUserTypes(UserTypeEnum.CUSTOMER);

// Supplier portal endpoints
export const SupplierPortalOnly = () => AllowedUserTypes(UserTypeEnum.SUPPLIER);

// Internal users only (excludes portal users)
export const InternalUsersOnly = () =>
  AllowedUserTypes(UserTypeEnum.EMPLOYEE, UserTypeEnum.ADMIN, UserTypeEnum.SYSTEM);

// Portal users only (customers and suppliers)
export const PortalUsersOnly = () =>
  AllowedUserTypes(UserTypeEnum.CUSTOMER, UserTypeEnum.SUPPLIER);

// Investor portal endpoints
export const InvestorPortalOnly = () => AllowedUserTypes(UserTypeEnum.INVESTOR);

// All portal users (customers, suppliers, and investors)
export const AllPortalUsersOnly = () =>
  AllowedUserTypes(UserTypeEnum.CUSTOMER, UserTypeEnum.SUPPLIER, UserTypeEnum.INVESTOR);
