import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { toMoney } from '../../../common/utils/decimal';
import {
  CreateAccountDto,
  UpdateAccountDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  AccountQueryDto,
  ImportAccountsDto,
} from '../dto';

export interface Account {
  id: number;
  entityId: number | null;
  companyId: number | null;
  categoryId: number | null;
  currencyId: number | null;
  code: string;
  name: string;
  description: string | null;
  accountType: string;
  ifrs18AccountType: string | null;
  parentId: number | null;
  isPosting: boolean;
  closingRate: boolean;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: number;
  entityId: number | null;
  name: string;
  categoryType: string;
  code: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  // ============================================================================
  // ACCOUNTS
  // ============================================================================

  async createAccount(companyId: number, dto: CreateAccountDto): Promise<Account> {
    // Check for duplicate code within company
    const existing = await this.tenantPrisma.queryOne<Account>(
      `SELECT * FROM ifrs_accounts WHERE "companyId" = $1 AND code = $2 AND "deletedAt" IS NULL`,
      [companyId, dto.code],
    );

    if (existing) {
      throw new BadRequestException(`Account with code ${dto.code} already exists`);
    }

    // If parent is specified, validate it exists
    if (dto.parentId) {
      const parent = await this.tenantPrisma.queryOne<Account>(
        `SELECT * FROM ifrs_accounts WHERE id = $1 AND "companyId" = $2 AND "deletedAt" IS NULL`,
        [dto.parentId, companyId],
      );
      if (!parent) {
        throw new NotFoundException('Parent account not found');
      }
    }

    return this.tenantPrisma.insert<Account>('ifrs_accounts', {
      companyId,
      code: dto.code,
      name: dto.name,
      description: dto.description || null,
      accountType: dto.accountType,
      ifrs18AccountType: dto.ifrs18AccountType || null,
      parentId: dto.parentId || null,
      categoryId: dto.categoryId || null,
      currencyId: dto.currencyId || null,
      entityId: dto.entityId || null,
      isPosting: dto.isPosting ?? true,
      closingRate: dto.closingRate ?? false,
      isActive: dto.isActive ?? true,
    });
  }

  async updateAccount(
    companyId: number,
    accountId: number,
    dto: UpdateAccountDto,
  ): Promise<Account> {
    const account = await this.findAccountById(companyId, accountId);

    // Check for circular reference if changing parent
    if (dto.parentId) {
      if (dto.parentId === accountId) {
        throw new BadRequestException('Account cannot be its own parent');
      }
      // Check parent exists
      const parent = await this.tenantPrisma.queryOne<Account>(
        `SELECT * FROM ifrs_accounts WHERE id = $1 AND "companyId" = $2 AND "deletedAt" IS NULL`,
        [dto.parentId, companyId],
      );
      if (!parent) {
        throw new NotFoundException('Parent account not found');
      }
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.accountType !== undefined) updateData.accountType = dto.accountType;
    if (dto.ifrs18AccountType !== undefined) updateData.ifrs18AccountType = dto.ifrs18AccountType;
    if (dto.parentId !== undefined) updateData.parentId = dto.parentId;
    if (dto.categoryId !== undefined) updateData.categoryId = dto.categoryId;
    if (dto.currencyId !== undefined) updateData.currencyId = dto.currencyId;
    if (dto.isPosting !== undefined) updateData.isPosting = dto.isPosting;
    if (dto.closingRate !== undefined) updateData.closingRate = dto.closingRate;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    if (Object.keys(updateData).length === 0) {
      return account;
    }

    const updated = await this.tenantPrisma.update<Account>(
      'ifrs_accounts',
      accountId,
      updateData,
    );

    if (!updated) {
      throw new NotFoundException('Account not found');
    }

    return updated;
  }

  async deleteAccount(companyId: number, accountId: number): Promise<void> {
    const account = await this.findAccountById(companyId, accountId);

    // Check if account has transactions
    const hasTransactions = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ifrs_transactions
       WHERE ("debitAccountId" = $1 OR "creditAccountId" = $1)
       AND "deletedAt" IS NULL`,
      [accountId],
    );

    if (parseInt(hasTransactions?.count || '0', 10) > 0) {
      throw new BadRequestException('Cannot delete account with transactions. Deactivate it instead.');
    }

    // Check if account has children
    const hasChildren = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ifrs_accounts
       WHERE "parentId" = $1 AND "deletedAt" IS NULL`,
      [accountId],
    );

    if (parseInt(hasChildren?.count || '0', 10) > 0) {
      throw new BadRequestException('Cannot delete account with child accounts');
    }

    await this.tenantPrisma.softDelete('ifrs_accounts', accountId);
  }

  async findAccountById(companyId: number, accountId: number): Promise<Account> {
    const account = await this.tenantPrisma.queryOne<Account>(
      `SELECT * FROM ifrs_accounts WHERE id = $1 AND "companyId" = $2 AND "deletedAt" IS NULL`,
      [accountId, companyId],
    );

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  async findAllAccounts(companyId: number, query: AccountQueryDto): Promise<{
    data: Account[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;

    let sql = `SELECT * FROM ifrs_accounts WHERE "companyId" = $1 AND "deletedAt" IS NULL`;
    let countSql = `SELECT COUNT(*) as count FROM ifrs_accounts WHERE "companyId" = $1 AND "deletedAt" IS NULL`;
    const params: any[] = [companyId];
    let paramIndex = 2;

    if (query.accountType) {
      sql += ` AND "accountType" = $${paramIndex}`;
      countSql += ` AND "accountType" = $${paramIndex}`;
      params.push(query.accountType);
      paramIndex++;
    }

    if (query.categoryId) {
      sql += ` AND "categoryId" = $${paramIndex}`;
      countSql += ` AND "categoryId" = $${paramIndex}`;
      params.push(query.categoryId);
      paramIndex++;
    }

    if (query.parentId !== undefined) {
      if (query.parentId === null) {
        sql += ` AND "parentId" IS NULL`;
        countSql += ` AND "parentId" IS NULL`;
      } else {
        sql += ` AND "parentId" = $${paramIndex}`;
        countSql += ` AND "parentId" = $${paramIndex}`;
        params.push(query.parentId);
        paramIndex++;
      }
    }

    if (query.isActive !== undefined) {
      sql += ` AND "isActive" = $${paramIndex}`;
      countSql += ` AND "isActive" = $${paramIndex}`;
      params.push(query.isActive);
      paramIndex++;
    }

    if (query.isPosting !== undefined) {
      sql += ` AND "isPosting" = $${paramIndex}`;
      countSql += ` AND "isPosting" = $${paramIndex}`;
      params.push(query.isPosting);
      paramIndex++;
    }

    if (query.search) {
      sql += ` AND (name ILIKE $${paramIndex} OR code ILIKE $${paramIndex})`;
      countSql += ` AND (name ILIKE $${paramIndex} OR code ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY code ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const [data, countResult] = await Promise.all([
      this.tenantPrisma.query<Account>(sql, params),
      this.tenantPrisma.queryOne<{ count: string }>(countSql, params.slice(0, -2)),
    ]);

    return {
      data,
      total: parseInt(countResult?.count || '0', 10),
      page,
      limit,
    };
  }

  async getAccountTree(companyId: number, accountType?: string): Promise<Account[]> {
    let sql = `SELECT * FROM ifrs_accounts WHERE "companyId" = $1 AND "deletedAt" IS NULL`;
    const params: any[] = [companyId];

    if (accountType) {
      sql += ` AND "accountType" = $2`;
      params.push(accountType);
    }

    sql += ` ORDER BY code ASC`;

    return this.tenantPrisma.query<Account>(sql, params);
  }

  async getAccountBalance(companyId: number, accountId: number): Promise<{
    balance: number;
    debitTotal: number;
    creditTotal: number;
  }> {
    const result = await this.tenantPrisma.queryOne<{
      debit_total: string;
      credit_total: string;
    }>(
      `SELECT
         COALESCE(SUM(CASE WHEN "debitAccountId" = $1 THEN amount ELSE 0 END), 0) as debit_total,
         COALESCE(SUM(CASE WHEN "creditAccountId" = $1 THEN amount ELSE 0 END), 0) as credit_total
       FROM ifrs_transactions
       WHERE ("debitAccountId" = $1 OR "creditAccountId" = $1)
         AND posted = true
         AND "deletedAt" IS NULL`,
      [accountId],
    );

    const debitTotal = toMoney(result?.debit_total);
    const creditTotal = toMoney(result?.credit_total);

    return {
      balance: debitTotal - creditTotal,
      debitTotal,
      creditTotal,
    };
  }

  // ============================================================================
  // CATEGORIES
  // ============================================================================

  async createCategory(companyId: number, dto: CreateCategoryDto): Promise<Category> {
    return this.tenantPrisma.insert<Category>('ifrs_categories', {
      entityId: dto.entityId || null,
      name: dto.name,
      categoryType: dto.categoryType,
      code: dto.code || null,
    });
  }

  async updateCategory(
    companyId: number,
    categoryId: number,
    dto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findCategoryById(categoryId);

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.categoryType !== undefined) updateData.categoryType = dto.categoryType;
    if (dto.code !== undefined) updateData.code = dto.code;

    if (Object.keys(updateData).length === 0) {
      return category;
    }

    const updated = await this.tenantPrisma.update<Category>(
      'ifrs_categories',
      categoryId,
      updateData,
    );

    if (!updated) {
      throw new NotFoundException('Category not found');
    }

    return updated;
  }

  async deleteCategory(categoryId: number): Promise<void> {
    const category = await this.findCategoryById(categoryId);

    // Check if category has accounts
    const hasAccounts = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ifrs_accounts WHERE "categoryId" = $1 AND "deletedAt" IS NULL`,
      [categoryId],
    );

    if (parseInt(hasAccounts?.count || '0', 10) > 0) {
      throw new BadRequestException('Cannot delete category with accounts');
    }

    await this.tenantPrisma.softDelete('ifrs_categories', categoryId);
  }

  async findCategoryById(categoryId: number): Promise<Category> {
    const category = await this.tenantPrisma.queryOne<Category>(
      `SELECT * FROM ifrs_categories WHERE id = $1 AND "deletedAt" IS NULL`,
      [categoryId],
    );

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async findAllCategories(categoryType?: string): Promise<Category[]> {
    let sql = `SELECT * FROM ifrs_categories WHERE "deletedAt" IS NULL`;
    const params: unknown[] = [];

    if (categoryType) {
      sql += ` AND "categoryType" = $1`;
      params.push(categoryType);
    }

    sql += ` ORDER BY name ASC`;

    return this.tenantPrisma.query<Category>(sql, params);
  }

  // ============================================================================
  // IMPORT
  // ============================================================================

  async importAccounts(
    companyId: number,
    dto: ImportAccountsDto,
  ): Promise<{
    imported: number;
    updated: number;
    skipped: number;
    errors: { row: number; code: string; message: string }[];
  }> {
    const validAccountTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
    const validIfrs18Types = ['operating', 'investing', 'financing'];
    const errors: { row: number; code: string; message: string }[] = [];
    const importMode = dto.importMode ?? 'skip';
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    // Get entity ID for this company
    const company = await this.tenantPrisma.queryOne<{ entityId: number | null }>(
      `SELECT "entityId" FROM companies WHERE id = $1`,
      [companyId],
    );
    const entityId = company?.entityId || null;

    // Load all existing accounts for this company (code → id map)
    const existingRows = await this.tenantPrisma.query<{ id: number; code: string }>(
      `SELECT id, code FROM ifrs_accounts WHERE "companyId" = $1 AND "deletedAt" IS NULL`,
      [companyId],
    );
    const existingMap = new Map(existingRows.map((a) => [a.code, a.id]));

    // Overwrite mode: blocked if ANY account has transactions or is a control account
    if (importMode === 'overwrite') {
      const txnCheck = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM journal_entry_line_items jli
         JOIN ifrs_accounts a ON a.id = jli."accountId"
         WHERE a."companyId" = $1`,
        [companyId],
      );
      if (parseInt(txnCheck?.count || '0', 10) > 0) {
        throw new BadRequestException(
          `Cannot overwrite chart of accounts: ${txnCheck?.count} journal entries exist. Use "Update" mode instead, which preserves accounts with transactions.`,
        );
      }

      const controlCheck = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM banks WHERE "glAccountId" IN (SELECT id FROM ifrs_accounts WHERE "companyId" = $1)`,
        [companyId],
      );
      if (parseInt(controlCheck?.count || '0', 10) > 0) {
        throw new BadRequestException(
          'Cannot overwrite chart of accounts: some accounts are linked as bank GL accounts. Use "Update" mode instead.',
        );
      }

      // Safe to overwrite — no transactions or control accounts
      const allAccountRows = await this.tenantPrisma.query<{ id: number }>(
        `SELECT id FROM ifrs_accounts WHERE "companyId" = $1`,
        [companyId],
      );
      const allAccountIds = allAccountRows.map((a) => a.id);
      if (allAccountIds.length > 0) {
        await this.tenantPrisma.query(`DELETE FROM budget_lines WHERE "accountId" = ANY($1::int[])`, [allAccountIds]);
        await this.tenantPrisma.query(`DELETE FROM ifrs_transactions WHERE "debitAccountId" = ANY($1::int[]) OR "creditAccountId" = ANY($1::int[])`, [allAccountIds]);
      }
      await this.tenantPrisma.query(`UPDATE ifrs_accounts SET "parentId" = NULL WHERE "companyId" = $1 AND "parentId" IS NOT NULL`, [companyId]);
      await this.tenantPrisma.query(`DELETE FROM ifrs_accounts WHERE "companyId" = $1`, [companyId]);
      existingMap.clear();
    }

    for (let i = 0; i < dto.accounts.length; i++) {
      const item = dto.accounts[i];
      const rowNum = i + 1;
      const accountType = item.accountType.toLowerCase();

      // Validate account type
      if (!validAccountTypes.includes(accountType)) {
        errors.push({
          row: rowNum,
          code: item.code,
          message: `Invalid accountType "${item.accountType}". Must be: ${validAccountTypes.join(', ')}`,
        });
        continue;
      }

      // Validate IFRS 18 type if provided
      if (item.ifrs18AccountType && !validIfrs18Types.includes(item.ifrs18AccountType.toLowerCase())) {
        errors.push({
          row: rowNum,
          code: item.code,
          message: `Invalid ifrs18AccountType "${item.ifrs18AccountType}". Must be: ${validIfrs18Types.join(', ')}`,
        });
        continue;
      }

      // Resolve parent account
      let parentId: number | null = null;
      if (item.parentCode) {
        const parentDbId = existingMap.get(item.parentCode);
        if (!parentDbId) {
          errors.push({
            row: rowNum,
            code: item.code,
            message: `Parent account code "${item.parentCode}" not found. Import parents before children.`,
          });
          continue;
        }
        parentId = parentDbId;
      }

      // Resolve category
      let categoryId: number | null = null;
      if (item.categoryType) {
        // Try exact categoryType match first
        let category = await this.tenantPrisma.queryOne<{ id: number }>(
          `SELECT id FROM ifrs_categories WHERE "categoryType" = $1 AND "deletedAt" IS NULL LIMIT 1`,
          [item.categoryType],
        );

        // Fallback: try matching by name (e.g. "current_asset" → "Current Assets")
        if (!category) {
          const nameGuess = item.categoryType.replace(/_/g, ' ');
          category = await this.tenantPrisma.queryOne<{ id: number }>(
            `SELECT id FROM ifrs_categories WHERE LOWER(name) LIKE $1 AND "deletedAt" IS NULL LIMIT 1`,
            [`%${nameGuess}%`],
          );
        }

        // Fallback 2: map granular type to broad account type
        if (!category) {
          const broadTypeMap: Record<string, string> = {
            current_asset: 'asset', non_current_asset: 'asset', contra_asset: 'asset',
            inventory: 'asset', bank: 'asset', receivable: 'asset',
            current_liability: 'liability', non_current_liability: 'liability',
            payable: 'liability', control: 'liability',
            equity: 'equity',
            operating_revenue: 'revenue', non_operating_revenue: 'revenue',
            direct_expense: 'expense', operating_expense: 'expense',
            overhead_expense: 'expense', other_expense: 'expense',
            reconciliation: 'expense',
          };
          const broadType = broadTypeMap[item.categoryType];
          if (broadType) {
            category = await this.tenantPrisma.queryOne<{ id: number }>(
              `SELECT id FROM ifrs_categories WHERE "categoryType" = $1 AND "deletedAt" IS NULL LIMIT 1`,
              [broadType],
            );
          }
        }

        if (!category) {
          errors.push({
            row: rowNum,
            code: item.code,
            message: `Category type "${item.categoryType}" not found`,
          });
          continue;
        }
        categoryId = category.id;
      }

      const existingId = existingMap.get(item.code);

      try {
        if (existingId) {
          // Account exists — handle based on importMode
          if (importMode === 'skip') {
            skipped++;
            continue;
          }

          if (importMode === 'update' || importMode === 'overwrite') {
            // Check if account has transactions
            const txnCount = await this.tenantPrisma.queryOne<{ count: string }>(
              `SELECT COUNT(*) as count FROM journal_entry_line_items WHERE "accountId" = $1`,
              [existingId],
            );
            if (parseInt(txnCount?.count || '0', 10) > 0) {
              errors.push({
                row: rowNum,
                code: item.code,
                message: `Account "${item.code}" has ${txnCount?.count} posted transactions and cannot be overridden. Delete or void transactions first.`,
              });
              skipped++;
              continue;
            }

            // Check if account is used as a control account
            const controlUsages: string[] = [];
            const checkControl = async (table: string, columns: string[], label: string) => {
              for (const col of columns) {
                const used = await this.tenantPrisma.queryOne<{ count: string }>(
                  `SELECT COUNT(*) as count FROM ${table} WHERE "${col}" = $1`,
                  [existingId],
                );
                if (parseInt(used?.count || '0', 10) > 0) {
                  controlUsages.push(`${label}.${col}`);
                }
              }
            };
            await checkControl('sales_settings', ['defaultSalesAccountId', 'defaultReceivablesAccountId', 'defaultDiscountAccountId', 'defaultReturnAccountId'], 'Sales Settings');
            await checkControl('banks', ['glAccountId'], 'Bank Account');
            // Check category GL mappings (jsonb — need special handling)
            const catMappingUsed = await this.tenantPrisma.queryOne<{ count: string }>(
              `SELECT COUNT(*) as count FROM inv_item_categories
               WHERE "glAccountMappings"::text LIKE $1 AND "deletedAt" IS NULL`,
              [`%${existingId}%`],
            );
            if (parseInt(catMappingUsed?.count || '0', 10) > 0) {
              controlUsages.push('Inventory Category GL Mapping');
            }

            if (controlUsages.length > 0) {
              errors.push({
                row: rowNum,
                code: item.code,
                message: `Account "${item.code}" is a control account used in: ${controlUsages.join(', ')}. Cannot be overridden.`,
              });
              skipped++;
              continue;
            }

            // Safe to update
            await this.tenantPrisma.query(
              `UPDATE ifrs_accounts SET
                name = $1,
                description = $2,
                "accountType" = $3,
                "categoryId" = $4,
                "parentId" = $5,
                "isPosting" = $6,
                "closingRate" = $7,
                "isActive" = $8,
                "ifrs18AccountType" = $9,
                "updatedAt" = NOW()
               WHERE id = $10 AND "companyId" = $11`,
              [
                item.name,
                item.description || null,
                accountType,
                categoryId,
                parentId,
                item.isPosting ?? true,
                item.closingRate ?? false,
                item.isActive ?? true,
                item.ifrs18AccountType?.toLowerCase() || null,
                existingId,
                companyId,
              ],
            );
            updated++;
          }
        } else {
          // New account — insert
          await this.tenantPrisma.insert('ifrs_accounts', {
            companyId,
            entityId,
            code: item.code,
            name: item.name,
            accountType,
            description: item.description || null,
            parentId,
            categoryId,
            isPosting: item.isPosting ?? true,
            closingRate: item.closingRate ?? false,
            isActive: item.isActive ?? true,
            ifrs18AccountType: item.ifrs18AccountType?.toLowerCase() || null,
          });
          existingMap.set(item.code, -1); // mark as processed for parent resolution
          imported++;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ row: rowNum, code: item.code, message });
      }
    }

    return { imported, updated, skipped, errors };
  }

  getImportTemplate(): { headers: string[]; sampleRows: string[][]; notes: Record<string, string> } {
    return {
      headers: [
        'code', 'name', 'accountType', 'categoryType',
        'parentCode', 'description', 'isPosting', 'ifrs18AccountType', 'closingRate', 'isActive',
      ],
      sampleRows: [
        // Assets
        ['1000', 'CURRENT ASSETS', 'asset', 'current_asset', '', 'Current assets header', 'false', '', 'false', 'true'],
        ['1010', 'Cash at Bank', 'asset', 'bank', '1000', 'Main operating bank account', 'true', '', 'true', 'true'],
        ['1020', 'Petty Cash', 'asset', 'current_asset', '1000', 'Petty cash fund', 'true', '', 'false', 'true'],
        ['1100', 'Accounts Receivable', 'asset', 'receivable', '', 'Trade receivables - customers', 'true', '', 'false', 'true'],
        ['1200', 'Inventory', 'asset', 'inventory', '', 'Stock on hand', 'true', '', 'false', 'true'],
        ['1500', 'NON-CURRENT ASSETS', 'asset', 'non_current_asset', '', 'Non-current assets header', 'false', '', 'false', 'true'],
        ['1510', 'Property Plant & Equipment', 'asset', 'non_current_asset', '1500', 'Fixed assets at cost', 'true', '', 'true', 'true'],
        // Liabilities
        ['2000', 'CURRENT LIABILITIES', 'liability', 'current_liability', '', 'Current liabilities header', 'false', '', 'false', 'true'],
        ['2010', 'Accounts Payable', 'liability', 'payable', '2000', 'Trade payables - suppliers', 'true', '', 'false', 'true'],
        ['2020', 'VAT Payable', 'liability', 'current_liability', '2000', 'Output VAT liability', 'true', '', 'false', 'true'],
        ['2500', 'NON-CURRENT LIABILITIES', 'liability', 'non_current_liability', '', 'Long-term liabilities', 'false', '', 'false', 'true'],
        ['2510', 'Bank Loan', 'liability', 'non_current_liability', '2500', 'Long-term bank borrowings', 'true', '', 'false', 'true'],
        // Equity
        ['3000', 'EQUITY', 'equity', 'equity', '', 'Shareholders equity header', 'false', '', 'false', 'true'],
        ['3010', 'Share Capital', 'equity', 'equity', '3000', 'Issued and paid-up share capital', 'true', '', 'false', 'true'],
        ['3020', 'Retained Earnings', 'equity', 'equity', '3000', 'Accumulated retained earnings', 'true', '', 'false', 'true'],
        // Revenue
        ['4000', 'REVENUE', 'revenue', 'operating_revenue', '', 'Revenue header', 'false', 'operating', '', 'true'],
        ['4010', 'Sales Revenue', 'revenue', 'operating_revenue', '4000', 'Product sales income', 'true', 'operating', '', 'true'],
        ['4020', 'Service Revenue', 'revenue', 'operating_revenue', '4000', 'Service income', 'true', 'operating', '', 'true'],
        ['4500', 'Other Income', 'revenue', 'non_operating_revenue', '', 'Non-operating income', 'true', 'investing', '', 'true'],
        // Expenses
        ['5000', 'COST OF SALES', 'expense', 'direct_expense', '', 'Direct cost of goods sold', 'false', 'operating', '', 'true'],
        ['5010', 'Cost of Goods Sold', 'expense', 'direct_expense', '5000', 'COGS', 'true', 'operating', '', 'true'],
        ['6000', 'OPERATING EXPENSES', 'expense', 'operating_expense', '', 'Operating expenses header', 'false', 'operating', '', 'true'],
        ['6010', 'Salaries & Wages', 'expense', 'operating_expense', '6000', 'Staff salaries', 'true', 'operating', '', 'true'],
        ['6020', 'Rent Expense', 'expense', 'overhead_expense', '6000', 'Office rent', 'true', 'operating', '', 'true'],
        ['6030', 'Utilities', 'expense', 'overhead_expense', '6000', 'Electricity, water, internet', 'true', 'operating', '', 'true'],
      ],
      notes: {
        accountType: 'Required. One of: asset | liability | equity | revenue | expense',
        categoryType: 'Optional. One of: non_current_asset | contra_asset | inventory | bank | current_asset | receivable | non_current_liability | control | current_liability | payable | equity | operating_revenue | operating_expense | non_operating_revenue | direct_expense | overhead_expense | other_expense | reconciliation',
        parentCode: 'Optional. Must match an existing account code or appear earlier in the file',
        isPosting: 'Optional. true = transactions post here; false = header/group account (default: true)',
        ifrs18AccountType: 'Optional. For revenue/expense only. One of: operating | investing | financing',
        closingRate: 'Optional. true = use closing exchange rate for forex (default: false)',
        isActive: 'Optional. true = active account (default: true)',
      },
    };
  }
}
