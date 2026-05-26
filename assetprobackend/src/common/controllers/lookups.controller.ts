import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { CompanyContextGuard } from '../guards/company-context.guard';
import { RequireCompany } from '../decorators/company-context.decorators';
import { CurrentUser } from '../../modules/auth/decorators/current-user.decorator';
import { TenantPrismaService } from '../services/tenant-prisma.service';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

/**
 * Shared lookups controller for cross-module reference data.
 *
 * Many modules (inventory, sales, purchasing, assets, budget, POS) need to
 * reference GL accounts, VAT rates, currencies, etc. from the accounts module.
 * This controller provides read-only access to that reference data without
 * requiring the 'accounts' module to be in the tenant's subscription plan.
 *
 * Requires JWT + CompanyContext so user.companyId is always populated.
 */
@ApiTags('Lookups')
@ApiBearerAuth()
@Controller('lookups')
@UseGuards(JwtAuthGuard, CompanyContextGuard)
@RequireCompany()
export class LookupsController {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // ============================================================================
  // GL ACCOUNTS
  // ============================================================================

  @Get('accounts')
  @ApiOperation({ summary: 'Lookup GL accounts for dropdowns (cross-module)' })
  @ApiResponse({ status: 200, description: 'Paginated list of GL accounts' })
  async getAccounts(
    @CurrentUser() user: AuthUser,
    @Query('accountType') accountType?: string,
    @Query('isPosting') isPosting?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('categoryName') categoryName?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '500', 10);
    const offset = (pageNum - 1) * limitNum;

    let sql = `SELECT * FROM ifrs_accounts WHERE "companyId" = $1 AND "deletedAt" IS NULL`;
    let countSql = `SELECT COUNT(*) as count FROM ifrs_accounts WHERE "companyId" = $1 AND "deletedAt" IS NULL`;
    const params: any[] = [user.companyId];
    let paramIndex = 2;

    if (accountType) {
      sql += ` AND "accountType" = $${paramIndex}`;
      countSql += ` AND "accountType" = $${paramIndex}`;
      params.push(accountType);
      paramIndex++;
    }

    if (isPosting !== undefined) {
      const val = isPosting === 'true';
      sql += ` AND "isPosting" = $${paramIndex}`;
      countSql += ` AND "isPosting" = $${paramIndex}`;
      params.push(val);
      paramIndex++;
    }

    if (isActive !== undefined) {
      const val = isActive === 'true';
      sql += ` AND "isActive" = $${paramIndex}`;
      countSql += ` AND "isActive" = $${paramIndex}`;
      params.push(val);
      paramIndex++;
    }

    if (categoryId) {
      sql += ` AND "categoryId" = $${paramIndex}`;
      countSql += ` AND "categoryId" = $${paramIndex}`;
      params.push(parseInt(categoryId, 10));
      paramIndex++;
    }

    if (categoryName) {
      sql += ` AND "categoryId" IN (SELECT id FROM ifrs_categories WHERE LOWER(name) = LOWER($${paramIndex}) AND "deletedAt" IS NULL)`;
      countSql += ` AND "categoryId" IN (SELECT id FROM ifrs_categories WHERE LOWER(name) = LOWER($${paramIndex}) AND "deletedAt" IS NULL)`;
      params.push(categoryName);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (name ILIKE $${paramIndex} OR code ILIKE $${paramIndex})`;
      countSql += ` AND (name ILIKE $${paramIndex} OR code ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY code ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offset);

    const [data, countResult] = await Promise.all([
      this.tenantPrisma.query<any>(sql, params),
      this.tenantPrisma.queryOne<{ count: string }>(countSql, params.slice(0, -2)),
    ]);

    return {
      data,
      total: parseInt(countResult?.count || '0', 10),
      page: pageNum,
      limit: limitNum,
    };
  }

  // ============================================================================
  // VAT RATES
  // ============================================================================

  @Get('vat')
  @ApiOperation({ summary: 'Lookup active VAT rates (cross-module)' })
  @ApiResponse({ status: 200, description: 'List of active VAT rates' })
  async getActiveVat(@CurrentUser() user: AuthUser) {
    return this.tenantPrisma.query<any>(
      `SELECT v.* FROM ifrs_vats v
       JOIN companies c ON c."entityId" = v."entityId"
       WHERE c.id = $1 AND v."isActive" = true AND v."deletedAt" IS NULL
       ORDER BY v.name ASC`,
      [user.companyId],
    );
  }

  // ============================================================================
  // CURRENCIES
  // ============================================================================

  @Get('currencies')
  @ApiOperation({ summary: 'Lookup active currencies (cross-module)' })
  @ApiResponse({ status: 200, description: 'List of active currencies' })
  async getActiveCurrencies(@CurrentUser() user: AuthUser) {
    // Currencies are tenant-wide; filter by the primary entity (entityId=1) so we don't
    // duplicate entries when a tenant has multiple companies with different entityIds.
    // Fall back to all active currencies if no match on the primary entity.
    return this.tenantPrisma.query<any>(
      `SELECT DISTINCT ON (code) cur.*
       FROM ifrs_currencies cur
       WHERE cur."isActive" = true AND cur."deletedAt" IS NULL
       ORDER BY code ASC`,
      [],
    );
  }

  // ============================================================================
  // PAYMENT METHODS
  // ============================================================================

  @Get('payment-methods')
  @ApiOperation({ summary: 'Lookup active payment methods (cross-module)' })
  @ApiResponse({ status: 200, description: 'List of active payment methods' })
  async getActivePaymentMethods(@CurrentUser() user: AuthUser) {
    return this.tenantPrisma.query<any>(
      `SELECT * FROM payment_methods WHERE "isActive" = true ORDER BY name ASC`,
      [],
    );
  }

  // ============================================================================
  // WHT RATES
  // ============================================================================

  @Get('wht')
  @ApiOperation({ summary: 'Lookup active WHT rates (cross-module)' })
  @ApiResponse({ status: 200, description: 'List of active WHT rates' })
  async getActiveWht(@CurrentUser() user: AuthUser) {
    return this.tenantPrisma.query<any>(
      `SELECT * FROM withholding_taxes WHERE "companyId" = $1 AND "isActive" = true ORDER BY name ASC`,
      [user.companyId],
    );
  }

  // ============================================================================
  // BANKS
  // ============================================================================

  @Get('banks')
  @ApiOperation({ summary: 'Lookup active banks (cross-module)' })
  @ApiResponse({ status: 200, description: 'List of active banks' })
  async getActiveBanks(@CurrentUser() user: AuthUser) {
    return this.tenantPrisma.query<any>(
      `SELECT * FROM banks WHERE "companyId" = $1 AND "isActive" = true ORDER BY name ASC`,
      [user.companyId],
    );
  }

  // ============================================================================
  // FISCAL YEARS
  // ============================================================================

  @Get('fiscal-years')
  @ApiOperation({ summary: 'Lookup fiscal years (cross-module)' })
  @ApiResponse({ status: 200, description: 'List of fiscal years' })
  async getFiscalYears(@CurrentUser() user: AuthUser) {
    return this.tenantPrisma.query<any>(
      `SELECT * FROM fiscal_years WHERE "companyId" = $1 ORDER BY "startDate" DESC`,
      [user.companyId],
    );
  }

  // ============================================================================
  // WAREHOUSES
  // ============================================================================

  @Get('warehouses')
  @ApiOperation({ summary: 'Lookup active warehouses (cross-module)' })
  @ApiResponse({ status: 200, description: 'List of active warehouses' })
  async getActiveWarehouses(@CurrentUser() user: AuthUser) {
    return this.tenantPrisma.query<any>(
      `SELECT * FROM inv_warehouses WHERE "companyId" = $1 AND "isActive" = true AND "deletedAt" IS NULL ORDER BY name ASC`,
      [user.companyId],
    );
  }

  // ============================================================================
  // UNITS OF MEASURE
  // ============================================================================

  @Get('uoms')
  @ApiOperation({ summary: 'Lookup active units of measure (cross-module)' })
  @ApiResponse({ status: 200, description: 'List of active UOMs' })
  async getActiveUoms(@CurrentUser() user: AuthUser) {
    return this.tenantPrisma.query<any>(
      `SELECT * FROM inv_unit_of_measures WHERE "isActive" = true ORDER BY name ASC`,
      [],
    );
  }

  // ============================================================================
  // EMPLOYEES (for sales rep dropdowns, etc.)
  // ============================================================================

  @Get('employees')
  @ApiOperation({ summary: 'Lookup active employees (cross-module, for sales rep selection etc.)' })
  @ApiResponse({ status: 200, description: 'List of active employees' })
  async getActiveEmployees(
    @CurrentUser() user: AuthUser,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = parseInt(limit || '500', 10);
    const params: unknown[] = [user.companyId];
    let paramIndex = 2;

    let sql = `SELECT e.id, e."employeeCode", e."firstName", e."lastName", e."personalEmail" as email,
                      d.name as "departmentName", p.title as "positionName"
               FROM employees e
               LEFT JOIN departments d ON d.id = e."departmentId"
               LEFT JOIN positions p ON p.id = e."positionId"
               WHERE e."companyId" = $1 AND e."deletedAt" IS NULL AND e."isActive" = true`;

    if (search) {
      sql += ` AND (e."firstName" ILIKE $${paramIndex} OR e."lastName" ILIKE $${paramIndex} OR e."employeeCode" ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY e."firstName" ASC, e."lastName" ASC LIMIT $${paramIndex}`;
    params.push(limitNum);

    const data = await this.tenantPrisma.query<any>(sql, params);
    return { data, total: data.length };
  }

  // ============================================================================
  // PRICE GROUPS
  // ============================================================================

  @Get('sales-reps')
  @ApiOperation({ summary: 'Lookup active sales reps (cross-module)' })
  @ApiResponse({ status: 200, description: 'List of active sales reps' })
  async getActiveSalesReps(
    @CurrentUser() user: AuthUser,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = parseInt(limit || '500', 10);
    const params: unknown[] = [user.companyId];
    let paramIndex = 2;

    let sql = `SELECT sr.id, sr.code, sr."firstName", sr."lastName", sr.email, sr.type,
                      sr."commissionRate", sr."salesAreaId",
                      sa.name as "salesAreaName"
               FROM sales_reps sr
               LEFT JOIN sales_areas sa ON sa.id = sr."salesAreaId"
               WHERE sr."companyId" = $1 AND sr."deletedAt" IS NULL AND sr."isActive" = true`;

    if (search) {
      sql += ` AND (sr."firstName" ILIKE $${paramIndex} OR sr."lastName" ILIKE $${paramIndex} OR sr.code ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY sr."firstName" ASC, sr."lastName" ASC LIMIT $${paramIndex}`;
    params.push(limitNum);

    const data = await this.tenantPrisma.query<Record<string, unknown>>(sql, params);
    return { data, total: data.length };
  }

  @Get('price-groups')
  @ApiOperation({ summary: 'Lookup active price groups (cross-module)' })
  @ApiResponse({ status: 200, description: 'List of active price groups' })
  async getActivePriceGroups(@CurrentUser() user: AuthUser) {
    const data = await this.tenantPrisma.query<any>(
      `SELECT id, code, name, description, "isDefault"
       FROM inv_item_price_groups
       WHERE "companyId" = $1 AND "isActive" = true AND "deletedAt" IS NULL
       ORDER BY name ASC`,
      [user.companyId],
    );
    return data;
  }
}
