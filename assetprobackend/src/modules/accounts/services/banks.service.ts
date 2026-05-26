import { Injectable, NotFoundException, BadRequestException, Logger, Optional } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { ProcessApprovalService } from '../../core/services/process-approval.service';
import { toMoney } from '../../../common/utils/decimal';
import {
  CreateBankDto,
  UpdateBankDto,
  BankTransferDto,
  CreateBankReconciliationDto,
  UpdateBankReconciliationDto,
  BankQueryDto,
  CreateBankAuthorizationDto,
  UpdateBankAuthorizationDto,
  BankAuthorizationQueryDto,
  CreateBankTransferDto,
  UpdateBankTransferDto,
  BankTransferQueryDto,
  ApproveBankTransferDto,
  RejectBankTransferDto,
} from '../dto';

export interface Bank {
  id: number;
  companyId: number;
  branchId: number | null;
  name: string;
  accountName: string | null;
  accountNumber: string;
  bankName: string;
  branchCode: string | null;
  swiftCode: string | null;
  iban: string | null;
  routingNumber: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  glAccountId: number | null;
  currencyCode: string;
  openingBalance: number | null;
  openingBalanceDate: Date | null;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankTransfer {
  id: number;
  companyId: number;
  fromBankId: number;
  toBankId: number;
  transferNumber: string;
  branchId: number | null;
  entityId: number | null;
  amount: number;
  totalAmount: number;
  currencyId: number | null;
  exchangeRate: number;
  transferDate: Date;
  reference: string | null;
  description: string | null;
  status: string;
  journalEntryId: number | null;
  approvedBy: number | null;
  approvedAt: Date | null;
  approvalNotes: string | null;
  postedBy: number | null;
  postedAt: Date | null;
  completedAt: Date | null;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: Date;
  updatedAt: Date;
  items?: BankTransferItem[];
  fromBankName?: string;
  toBankName?: string;
}

export interface BankTransferItem {
  id: number;
  bankTransferId: number;
  lineNumber: number;
  transferType: string;
  sourceAccountId: number;
  sourceBankId: number | null;
  destinationBankId: number;
  destinationAccountId: number;
  amount: number;
  description: string | null;
  sourceAccountName?: string;
  destinationAccountName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankReconciliation {
  id: number;
  companyId: number;
  bankId: number;
  periodStart: Date;
  periodEnd: Date;
  statementBalance: number;
  bookBalance: number | null;
  adjustedBalance: number | null;
  status: string;
  reconciliationDate: Date | null;
  reconciledBy: number | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankAuthorization {
  id: number;
  bankId: number;
  employeeId: number;
  employeeName?: string;
  bankName?: string;
  canView: boolean;
  canDeposit: boolean;
  canWithdraw: boolean;
  canTransfer: boolean;
  maxAmount: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class BanksService {
  private readonly logger = new Logger(BanksService.name);

  constructor(
    private tenantPrisma: TenantPrismaService,
    @Optional() private approvalService?: ProcessApprovalService,
  ) {}

  // ============================================================================
  // BANKS
  // ============================================================================

  async createBank(companyId: number, dto: CreateBankDto): Promise<Bank> {
    // Check for duplicate account number
    const existing = await this.tenantPrisma.queryOne<Bank>(
      `SELECT * FROM banks WHERE "companyId" = $1 AND "accountNumber" = $2 AND "deletedAt" IS NULL`,
      [companyId, dto.accountNumber],
    );

    if (existing) {
      throw new BadRequestException(`Bank account ${dto.accountNumber} already exists`);
    }

    // If GL account specified, verify it exists and is a bank-type account
    if (dto.glAccountId) {
      const glAccount = await this.tenantPrisma.queryOne<{ accountType: string }>(
        `SELECT "accountType" FROM ifrs_accounts WHERE id = $1 AND "companyId" = $2 AND "deletedAt" IS NULL`,
        [dto.glAccountId, companyId],
      );

      if (!glAccount) {
        throw new NotFoundException('GL Account not found');
      }
    }

    const bank = await this.tenantPrisma.insert<Bank>('banks', {
      companyId,
      branchId: dto.branchId || null,
      name: dto.name,
      accountName: dto.accountName || null,
      accountNumber: dto.accountNumber,
      bankName: dto.bankName,
      branchCode: dto.branch || null,
      swiftCode: dto.swiftCode || null,
      routingNumber: dto.routingNumber || null,
      contactPerson: dto.contactPerson || null,
      contactPhone: dto.contactPhone || null,
      contactEmail: dto.contactEmail || null,
      glAccountId: dto.glAccountId || null,
      currencyCode: dto.currencyCode || 'NGN',
      openingBalance: dto.openingBalance ?? 0,
      openingBalanceDate: dto.openingBalanceDate || null,
      isActive: dto.isActive ?? true,
    });

    // Post GL journal entry for opening balance
    if ((dto.openingBalance ?? 0) > 0 && dto.glAccountId) {
      await this.postOpeningBalanceJournal(companyId, bank, dto.openingBalance!, dto.openingBalanceDate || null, dto.openingBalanceExchangeRate);
    }

    // Sync authorized employees if provided
    if (dto.authorizedEmployeeIds && dto.authorizedEmployeeIds.length > 0) {
      await this.syncBankAuthorizations(bank.id, dto.authorizedEmployeeIds);
    }

    return bank;
  }

  async updateBank(companyId: number, bankId: number, dto: UpdateBankDto): Promise<Bank> {
    const bank = await this.findBankById(companyId, bankId);

    // Check for duplicate if account number is being changed
    if (dto.accountNumber && dto.accountNumber !== bank.accountNumber) {
      const existing = await this.tenantPrisma.queryOne<Bank>(
        `SELECT * FROM banks WHERE "companyId" = $1 AND "accountNumber" = $2 AND id != $3 AND "deletedAt" IS NULL`,
        [companyId, dto.accountNumber, bankId],
      );

      if (existing) {
        throw new BadRequestException(`Bank account ${dto.accountNumber} already exists`);
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.branchId !== undefined) updateData.branchId = dto.branchId || null;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.accountName !== undefined) updateData.accountName = dto.accountName;
    if (dto.accountNumber !== undefined) updateData.accountNumber = dto.accountNumber;
    if (dto.bankName !== undefined) updateData.bankName = dto.bankName;
    if (dto.branch !== undefined) updateData.branchCode = dto.branch;
    if (dto.swiftCode !== undefined) updateData.swiftCode = dto.swiftCode || null;
    if (dto.routingNumber !== undefined) updateData.routingNumber = dto.routingNumber || null;
    if (dto.contactPerson !== undefined) updateData.contactPerson = dto.contactPerson || null;
    if (dto.contactPhone !== undefined) updateData.contactPhone = dto.contactPhone || null;
    if (dto.contactEmail !== undefined) updateData.contactEmail = dto.contactEmail || null;
    if (dto.glAccountId !== undefined) updateData.glAccountId = dto.glAccountId;
    if (dto.currencyCode !== undefined) updateData.currencyCode = dto.currencyCode;
    if (dto.openingBalance !== undefined) updateData.openingBalance = dto.openingBalance;
    if (dto.openingBalanceDate !== undefined) updateData.openingBalanceDate = dto.openingBalanceDate || null;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    let result = bank;

    if (Object.keys(updateData).length > 0) {
      const updated = await this.tenantPrisma.update<Bank>('banks', bankId, updateData);
      if (!updated) {
        throw new NotFoundException('Bank not found');
      }
      result = updated;
    }

    // Post GL journal if opening balance changed and is > 0
    const newBalance = dto.openingBalance ?? bank.openingBalance ?? 0;
    const oldBalance = bank.openingBalance ?? 0;
    const glAccountId = dto.glAccountId ?? bank.glAccountId;
    if (newBalance > 0 && newBalance !== oldBalance && glAccountId) {
      await this.postOpeningBalanceJournal(
        companyId,
        { ...result, glAccountId },
        newBalance,
        dto.openingBalanceDate || (bank.openingBalanceDate ? String(bank.openingBalanceDate) : null),
        dto.openingBalanceExchangeRate,
      );
    }

    // Sync authorized employees if provided
    if (dto.authorizedEmployeeIds !== undefined) {
      await this.syncBankAuthorizations(bankId, dto.authorizedEmployeeIds);
    }

    return result;
  }

  async deleteBank(companyId: number, bankId: number): Promise<void> {
    const bank = await this.findBankById(companyId, bankId);

    // Check for transfers
    const hasTransfers = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM bank_transfers WHERE "fromBankId" = $1 OR "toBankId" = $1`,
      [bankId],
    );

    if (parseInt(hasTransfers?.count || '0', 10) > 0) {
      throw new BadRequestException('Cannot delete bank with transfers. Deactivate it instead.');
    }

    await this.tenantPrisma.softDelete('banks', bankId);
  }

  async findBankById(companyId: number, bankId: number): Promise<Bank> {
    const bank = await this.tenantPrisma.queryOne<Bank>(
      `SELECT * FROM banks WHERE id = $1 AND "companyId" = $2 AND "deletedAt" IS NULL`,
      [bankId, companyId],
    );

    if (!bank) {
      throw new NotFoundException('Bank not found');
    }

    return bank;
  }

  async findAllBanks(companyId: number, query: BankQueryDto): Promise<{
    data: Bank[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;

    let sql = `SELECT * FROM banks WHERE "companyId" = $1 AND "deletedAt" IS NULL`;
    let countSql = `SELECT COUNT(*) as count FROM banks WHERE "companyId" = $1 AND "deletedAt" IS NULL`;
    const params: any[] = [companyId];
    let paramIndex = 2;

    if (query.isActive !== undefined) {
      sql += ` AND "isActive" = $${paramIndex}`;
      countSql += ` AND "isActive" = $${paramIndex}`;
      params.push(query.isActive);
      paramIndex++;
    }

    if (query.search) {
      sql += ` AND (name ILIKE $${paramIndex} OR "accountNumber" ILIKE $${paramIndex} OR "bankName" ILIKE $${paramIndex})`;
      countSql += ` AND (name ILIKE $${paramIndex} OR "accountNumber" ILIKE $${paramIndex} OR "bankName" ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const [data, countResult] = await Promise.all([
      this.tenantPrisma.query<Bank>(sql, params),
      this.tenantPrisma.queryOne<{ count: string }>(countSql, params.slice(0, -2)),
    ]);

    return {
      data,
      total: parseInt(countResult?.count || '0', 10),
      page,
      limit,
    };
  }

  async getBankBalance(companyId: number, bankId: number): Promise<{
    balance: number;
    foreignBalance: number | null;
    currencyCode: string;
    totalDeposits: number;
    totalWithdrawals: number;
  }> {
    const bank = await this.findBankById(companyId, bankId);

    const currencyCode = bank.currencyCode || 'NGN';
    const isForeignCurrency = currencyCode !== 'NGN';

    if (!bank.glAccountId) {
      return {
        balance: bank.openingBalance || 0,
        foreignBalance: null,
        currencyCode,
        totalDeposits: 0,
        totalWithdrawals: 0,
      };
    }

    // Calculate balance from GL (source of truth)
    // Includes: opening balances, journal entries (receipts, payments, transfers, etc.)
    const glResult = await this.tenantPrisma.queryOne<{
      totalDebit: string;
      totalCredit: string;
    }>(
      `SELECT
         COALESCE(SUM(jel.debit), 0) as "totalDebit",
         COALESCE(SUM(jel.credit), 0) as "totalCredit"
       FROM journal_entry_line_items jel
       JOIN journal_entries je ON je.id = jel."journalEntryId"
       WHERE jel."accountId" = $1
         AND je.status = 'posted'
         AND je."deletedAt" IS NULL`,
      [bank.glAccountId],
    );

    // Include opening balances from ifrs_balances
    // balanceType: 'debit' means debit balance, 'credit' means credit balance
    const obResult = await this.tenantPrisma.queryOne<{
      obBalance: string;
      obType: string;
    }>(
      `SELECT
         COALESCE(SUM(balance), 0) as "obBalance",
         MAX("balanceType") as "obType"
       FROM ifrs_balances
       WHERE "accountId" = $1`,
      [bank.glAccountId],
    );

    const obAmount = toMoney(obResult?.obBalance);
    const obIsDebit = !obResult?.obType || obResult.obType === 'debit';

    const totalDebit = toMoney(glResult?.totalDebit) + (obIsDebit ? obAmount : 0) + toMoney(bank.openingBalance);
    const totalCredit = toMoney(glResult?.totalCredit) + (obIsDebit ? 0 : obAmount);
    const balance = toMoney(totalDebit - totalCredit);

    // For foreign currency banks, calculate balance in the bank's own currency
    let foreignBalance: number | null = null;
    const foreignDebug: Record<string, unknown> = {};
    if (isForeignCurrency) {
      try {
        // Query each source individually — no silent error swallowing
        let transfersIn = 0, transfersOut = 0, paymentsOut = 0, receiptsIn = 0;

        try {
          const r = await this.tenantPrisma.queryOne<{ total: string; cnt: string }>(
            `SELECT COALESCE(SUM(CASE WHEN "transferType" = 'foreign' THEN COALESCE("destinationAmount", amount) ELSE amount END), 0) as total,
                    COUNT(*)::text as cnt
             FROM bank_transfers WHERE "toBankId" = $1 AND status = 'posted'`, [bankId]);
          transfersIn = toMoney(r?.total);
          foreignDebug.transfersIn = { total: transfersIn, count: r?.cnt };
        } catch (e) { foreignDebug.transfersInError = (e as Error).message; }

        try {
          const r = await this.tenantPrisma.queryOne<{ total: string; cnt: string }>(
            `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*)::text as cnt
             FROM bank_transfers WHERE "fromBankId" = $1 AND status = 'posted'`, [bankId]);
          transfersOut = toMoney(r?.total);
          foreignDebug.transfersOut = { total: transfersOut, count: r?.cnt };
        } catch (e) { foreignDebug.transfersOutError = (e as Error).message; }

        try {
          const r = await this.tenantPrisma.queryOne<{ total: string; cnt: string }>(
            `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*)::text as cnt
             FROM im_import_payments WHERE "bankId" = $1 AND "deletedAt" IS NULL`, [bankId]);
          paymentsOut = toMoney(r?.total);
          foreignDebug.paymentsOut = { total: paymentsOut, count: r?.cnt };
        } catch (e) { foreignDebug.paymentsOutError = (e as Error).message; }

        try {
          const r = await this.tenantPrisma.queryOne<{ total: string; cnt: string }>(
            `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*)::text as cnt
             FROM customer_receipts WHERE "bankAccountId" = $1 AND status IN ('approved','posted','APPROVED') AND "deletedAt" IS NULL`, [bankId]);
          receiptsIn = toMoney(r?.total);
          foreignDebug.receiptsIn = { total: receiptsIn, count: r?.cnt };
        } catch (e) { foreignDebug.receiptsInError = (e as Error).message; }

        const openBal = toMoney(bank.openingBalance);
        foreignDebug.openingBalance = openBal;
        foreignBalance = toMoney(openBal + transfersIn + receiptsIn - transfersOut - paymentsOut);
        foreignDebug.calculatedBalance = foreignBalance;
      } catch (err) {
        this.logger.warn(`Foreign balance calc failed for bank ${bankId}: ${(err as Error).message}`);
        foreignDebug.error = (err as Error).message;
      }
    }

    return {
      balance,
      foreignBalance,
      currencyCode,
      totalDeposits: totalDebit,
      totalWithdrawals: totalCredit,
    };
  }

  // ============================================================================
  // BANK AUTHORIZATIONS
  // ============================================================================

  /**
   * Sync authorized employees for a bank. Removes existing authorizations
   * not in the list and adds new ones.
   */

  // ==========================================================================
  // POST OPENING BALANCE → GL JOURNAL ENTRY (DR Bank, CR Opening Balances Equity)
  // ==========================================================================

  private async postOpeningBalanceJournal(
    companyId: number,
    bank: Bank,
    amount: number,
    balanceDate: string | null,
    exchangeRate?: number,
  ): Promise<void> {
    const foreignValue = toMoney(amount);
    if (foreignValue <= 0 || !bank.glAccountId) return;

    // Determine if this is a foreign currency bank
    const company = await this.tenantPrisma.queryOne<{ currency: string }>(
      `SELECT currency FROM companies WHERE id = $1 AND "deletedAt" IS NULL`,
      [companyId],
    );
    const baseCurrency = company?.currency || 'NGN';
    const isForeignCurrency = bank.currencyCode && bank.currencyCode !== baseCurrency;

    // For foreign currency banks, exchange rate is mandatory
    if (isForeignCurrency && (!exchangeRate || exchangeRate <= 0)) {
      this.logger.warn(
        `Bank opening balance GL skipped for ${bank.name}: Foreign currency (${bank.currencyCode}) requires an exchange rate to ${baseCurrency}`,
      );
      return;
    }

    const rate = isForeignCurrency && exchangeRate ? exchangeRate : 1;
    const totalValue = toMoney(amount * rate); // base currency value

    try {
      // Find or create Opening Balances equity account
      let openingBalanceAccountId: number | null = null;

      const openingAcct = await this.tenantPrisma.queryOne<{ id: number }>(
        `SELECT id FROM ifrs_accounts
         WHERE "companyId" = $1
           AND "accountType" = 'equity'
           AND LOWER(name) LIKE '%opening balance%'
           AND "isPosting" = true
           AND "isActive" = true
           AND "deletedAt" IS NULL
         ORDER BY code LIMIT 1`,
        [companyId],
      );
      openingBalanceAccountId = openingAcct?.id || null;

      if (!openingBalanceAccountId) {
        const exact = await this.tenantPrisma.queryOne<{ id: number }>(
          `SELECT id FROM ifrs_accounts
           WHERE "companyId" = $1
             AND "accountType" = 'equity'
             AND LOWER(name) LIKE '%opening%'
             AND "isPosting" = true
             AND "isActive" = true
             AND "deletedAt" IS NULL
           ORDER BY code LIMIT 1`,
          [companyId],
        );
        openingBalanceAccountId = exact?.id || null;
      }

      if (!openingBalanceAccountId) {
        this.logger.warn(`Bank opening balance GL skipped for bank ${bank.id}: No Opening Balances equity account found`);
        return;
      }

      // Generate journal entry number
      const seq = await this.tenantPrisma.queryOne<{ max_num: string }>(
        `SELECT MAX(SUBSTRING("entryNumber" FROM '([0-9]+)$')::int) as max_num FROM journal_entries WHERE "companyId" = $1`,
        [companyId],
      );
      const nextNum = (parseInt(seq?.max_num || '0', 10) + 1).toString().padStart(5, '0');
      const entryNumber = `JE-${new Date().getFullYear()}-${nextNum}`;
      const entryDate = balanceDate ? new Date(balanceDate) : new Date();

      const fxNote = rate !== 1 ? ` [${bank.currencyCode} ${foreignValue.toLocaleString()} @ ${rate}]` : '';

      const je = await this.tenantPrisma.insert<{ id: number }>('journal_entries', {
        companyId,
        entryNumber,
        entryDate,
        reference: `BANK-OB-${bank.id}`,
        narration: `Opening Balance - ${bank.name} (${bank.accountNumber})${fxNote}`,
        totalDebit: totalValue,
        totalCredit: totalValue,
        status: 'posted',
        journalType: 'general',
        sourceType: 'bank_opening_balance',
        sourceId: bank.id,
        postedAt: new Date(),
      });

      const isForeign = rate !== 1;
      const fxFields = isForeign ? {
        currencyCode: bank.currencyCode,
        foreignDebit: foreignValue,
        foreignCredit: 0,
        exchangeRate: rate,
      } : {};

      // DR Bank GL Account (base currency value + foreign currency tracking)
      await this.tenantPrisma.insert('journal_entry_line_items', {
        journalEntryId: je.id,
        accountId: bank.glAccountId,
        debit: totalValue,
        credit: 0,
        narration: `Opening balance - ${bank.name}${fxNote}`,
        ...fxFields,
      });

      // CR Opening Balances (Equity) — always in base currency
      await this.tenantPrisma.insert('journal_entry_line_items', {
        journalEntryId: je.id,
        accountId: openingBalanceAccountId,
        debit: 0,
        credit: totalValue,
        narration: `Opening balance equity - ${bank.name}${fxNote}`,
        ...(isForeign ? {
          currencyCode: bank.currencyCode,
          foreignDebit: 0,
          foreignCredit: foreignValue,
          exchangeRate: rate,
        } : {}),
      });

      this.logger.log(`Bank opening balance GL posted: ${entryNumber} DR Bank ${totalValue} / CR Opening Balances ${totalValue} for ${bank.name}${isForeign ? ` (foreign: ${bank.currencyCode} ${foreignValue} @ ${rate})` : ''}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`GL FAILED for bank opening balance #${bank.id}: ${msg}`, err instanceof Error ? err.stack : '');
      throw new BadRequestException(`Bank created but GL posting failed for opening balance: ${msg}. Check GL account configuration.`);
    }
  }

  private async syncBankAuthorizations(bankId: number, employeeIds: number[]): Promise<void> {
    // Get existing authorizations
    const existing = await this.tenantPrisma.query<{ id: number; employeeId: number }>(
      `SELECT id, "employeeId" FROM bank_authorizations WHERE "bankId" = $1`,
      [bankId],
    );

    const existingEmpIds = existing.map((a) => a.employeeId);
    const toAdd = employeeIds.filter((id) => !existingEmpIds.includes(id));
    const toRemove = existing.filter((a) => !employeeIds.includes(a.employeeId));

    // Remove unauthorized
    for (const auth of toRemove) {
      await this.tenantPrisma.query(
        `DELETE FROM bank_authorizations WHERE id = $1`,
        [auth.id],
      );
    }

    // Add new authorizations
    for (const empId of toAdd) {
      await this.tenantPrisma.insert('bank_authorizations', {
        bankId,
        employeeId: empId,
        canView: true,
        canDeposit: false,
        canWithdraw: false,
        canTransfer: false,
        isActive: true,
      });
    }
  }

  async createAuthorization(
    companyId: number,
    dto: CreateBankAuthorizationDto,
  ): Promise<BankAuthorization> {
    // Verify bank belongs to company
    await this.findBankById(companyId, dto.bankId);

    // Verify employee exists
    const employee = await this.tenantPrisma.queryOne<{ id: number }>(
      `SELECT id FROM employees WHERE id = $1 AND "companyId" = $2`,
      [dto.employeeId, companyId],
    );
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check for existing authorization
    const existing = await this.tenantPrisma.queryOne<BankAuthorization>(
      `SELECT * FROM bank_authorizations WHERE "bankId" = $1 AND "employeeId" = $2`,
      [dto.bankId, dto.employeeId],
    );
    if (existing) {
      throw new BadRequestException('Authorization already exists for this employee and bank');
    }

    return this.tenantPrisma.insert<BankAuthorization>('bank_authorizations', {
      bankId: dto.bankId,
      employeeId: dto.employeeId,
      canView: dto.canView ?? true,
      canDeposit: dto.canDeposit ?? false,
      canWithdraw: dto.canWithdraw ?? false,
      canTransfer: dto.canTransfer ?? false,
      maxAmount: dto.maxAmount || null,
      isActive: dto.isActive ?? true,
    });
  }

  async updateAuthorization(
    companyId: number,
    authId: number,
    dto: UpdateBankAuthorizationDto,
  ): Promise<BankAuthorization> {
    const auth = await this.findAuthorizationById(authId);

    // Verify bank belongs to company
    await this.findBankById(companyId, auth.bankId);

    const updateData: Record<string, any> = {};
    if (dto.canView !== undefined) updateData.canView = dto.canView;
    if (dto.canDeposit !== undefined) updateData.canDeposit = dto.canDeposit;
    if (dto.canWithdraw !== undefined) updateData.canWithdraw = dto.canWithdraw;
    if (dto.canTransfer !== undefined) updateData.canTransfer = dto.canTransfer;
    if (dto.maxAmount !== undefined) updateData.maxAmount = dto.maxAmount;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    if (Object.keys(updateData).length === 0) {
      return auth;
    }

    const updated = await this.tenantPrisma.update<BankAuthorization>(
      'bank_authorizations',
      authId,
      updateData,
    );

    if (!updated) {
      throw new NotFoundException('Bank authorization not found');
    }

    return updated;
  }

  async deleteAuthorization(companyId: number, authId: number): Promise<void> {
    const auth = await this.findAuthorizationById(authId);
    await this.findBankById(companyId, auth.bankId);

    await this.tenantPrisma.query(
      `DELETE FROM bank_authorizations WHERE id = $1`,
      [authId],
    );
  }

  async findAuthorizationById(authId: number): Promise<BankAuthorization> {
    const auth = await this.tenantPrisma.queryOne<BankAuthorization>(
      `SELECT * FROM bank_authorizations WHERE id = $1`,
      [authId],
    );

    if (!auth) {
      throw new NotFoundException('Bank authorization not found');
    }

    return auth;
  }

  async findAuthorizationsByBank(
    companyId: number,
    bankId: number,
  ): Promise<BankAuthorization[]> {
    await this.findBankById(companyId, bankId);

    return this.tenantPrisma.query<BankAuthorization>(
      `SELECT ba.*,
         e."firstName" || ' ' || e."lastName" as "employeeName"
       FROM bank_authorizations ba
       JOIN employees e ON e.id = ba."employeeId"
       WHERE ba."bankId" = $1 AND ba."isActive" = true
       ORDER BY e."firstName" ASC`,
      [bankId],
    );
  }

  async findAuthorizationsByEmployee(
    companyId: number,
    employeeId: number,
  ): Promise<BankAuthorization[]> {
    return this.tenantPrisma.query<BankAuthorization>(
      `SELECT ba.*,
         b.name as "bankName", b."accountNumber"
       FROM bank_authorizations ba
       JOIN banks b ON b.id = ba."bankId"
       WHERE ba."employeeId" = $1 AND b."companyId" = $2 AND ba."isActive" = true
       ORDER BY b.name ASC`,
      [employeeId, companyId],
    );
  }

  async getAuthorizedBanks(companyId: number, employeeId: number): Promise<Bank[]> {
    return this.tenantPrisma.query<Bank>(
      `SELECT b.*
       FROM banks b
       JOIN bank_authorizations ba ON ba."bankId" = b.id
       WHERE b."companyId" = $1 AND ba."employeeId" = $2 AND ba."isActive" = true AND b."isActive" = true AND b."deletedAt" IS NULL
       ORDER BY b.name ASC`,
      [companyId, employeeId],
    );
  }

  async isAuthorizedOnBank(
    employeeId: number,
    bankId: number,
    action?: 'view' | 'deposit' | 'withdraw' | 'transfer',
  ): Promise<boolean> {
    const auth = await this.tenantPrisma.queryOne<BankAuthorization>(
      `SELECT * FROM bank_authorizations WHERE "bankId" = $1 AND "employeeId" = $2 AND "isActive" = true`,
      [bankId, employeeId],
    );

    if (!auth) return false;

    switch (action) {
      case 'view': return auth.canView;
      case 'deposit': return auth.canDeposit;
      case 'withdraw': return auth.canWithdraw;
      case 'transfer': return auth.canTransfer;
      default: return true;
    }
  }

  async validateTransferAuthorization(
    employeeId: number,
    items: Array<{ sourceBankId?: number; destinationBankId: number; amount: number }>,
  ): Promise<string[]> {
    const errors: string[] = [];

    for (const item of items) {
      if (item.sourceBankId) {
        const sourceAuth = await this.tenantPrisma.queryOne<BankAuthorization>(
          `SELECT * FROM bank_authorizations WHERE "bankId" = $1 AND "employeeId" = $2 AND "isActive" = true`,
          [item.sourceBankId, employeeId],
        );

        if (!sourceAuth || !sourceAuth.canTransfer) {
          errors.push(`Not authorized to transfer from bank ID ${item.sourceBankId}`);
        } else if (sourceAuth.maxAmount && item.amount > Number(sourceAuth.maxAmount)) {
          errors.push(`Transfer amount exceeds maximum allowed for bank ID ${item.sourceBankId}`);
        }
      }

      const destAuth = await this.tenantPrisma.queryOne<BankAuthorization>(
        `SELECT * FROM bank_authorizations WHERE "bankId" = $1 AND "employeeId" = $2 AND "isActive" = true`,
        [item.destinationBankId, employeeId],
      );

      if (!destAuth || !destAuth.canDeposit) {
        errors.push(`Not authorized to deposit to bank ID ${item.destinationBankId}`);
      }
    }

    return errors;
  }

  // ============================================================================
  // BANK TRANSFERS
  // ============================================================================

  async createTransfer(companyId: number, dto: BankTransferDto, userId?: number): Promise<BankTransfer> {
    // Validate from bank
    const fromBank = await this.findBankById(companyId, dto.fromBankId);
    if (!fromBank.isActive) {
      throw new BadRequestException('Source bank is inactive');
    }

    // Validate to bank
    const toBank = await this.findBankById(companyId, dto.toBankId);
    if (!toBank.isActive) {
      throw new BadRequestException('Destination bank is inactive');
    }

    if (dto.fromBankId === dto.toBankId) {
      throw new BadRequestException('Cannot transfer to the same bank');
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Transfer amount must be positive');
    }

    const transferType = dto.transferType || 'local';

    // For local transfers, validate same currency
    if (transferType === 'local') {
      const fromCurrency = (fromBank as unknown as Record<string, unknown>).currencyCode;
      const toCurrency = (toBank as unknown as Record<string, unknown>).currencyCode;
      if (fromCurrency && toCurrency && fromCurrency !== toCurrency) {
        throw new BadRequestException(
          `Local transfer requires same currency. Source bank is ${fromCurrency}, destination is ${toCurrency}. Use Foreign Transfer for cross-currency.`,
        );
      }
    }

    // For foreign transfers, validate exchange rate is provided
    if (transferType === 'foreign' && (!dto.exchangeRate || dto.exchangeRate <= 0)) {
      throw new BadRequestException('Exchange rate is required for foreign transfers');
    }

    const transferNumber = await this.generateTransferNumber(companyId);
    const bankCharges = Number(dto.bankCharges) || 0;
    const chargesAccountId = dto.chargesAccountId || null;
    const destinationAmount = transferType === 'foreign'
      ? Number(dto.destinationAmount) || dto.amount * (dto.exchangeRate || 1)
      : dto.amount;

    const transfer = await this.tenantPrisma.insert<BankTransfer>('bank_transfers', {
      companyId,
      branchId: dto.branchId || null,
      fromBankId: dto.fromBankId,
      toBankId: dto.toBankId,
      transferNumber,
      transferType,
      amount: dto.amount,
      totalAmount: dto.amount + bankCharges,
      chargesAccountId,
      destinationAmount,
      exchangeRate: dto.exchangeRate || 1,
      bankCharges,
      transferDate: dto.transferDate,
      reference: dto.reference || null,
      description: dto.narration || null,
      status: 'draft',
      createdBy: userId || null,
    });

    // Local transfers: auto-submit → auto-approve → auto-post (no approval needed)
    if (transferType === 'local') {
      try {
        // Submit
        await this.tenantPrisma.query(
          `UPDATE bank_transfers SET status = 'approved', "approvedBy" = $1, "approvedAt" = NOW() WHERE id = $2`,
          [userId, transfer.id],
        );
        // Post GL immediately
        return this.postTransfer(companyId, transfer.id, userId || 0);
      } catch (err) {
        this.logger.error(`GL FAILED for local transfer ${transfer.transferNumber}: ${(err as Error).message}`, (err as Error).stack);
        // Revert status to draft so it can be retried
        await this.tenantPrisma.query(
          `UPDATE bank_transfers SET status = 'draft', "approvedBy" = NULL, "approvedAt" = NULL WHERE id = $1`, [transfer.id],
        );
        throw new BadRequestException(`Transfer created but GL posting failed: ${(err as Error).message}. Transfer reverted to draft.`);
      }
    }

    // Foreign transfers: stay as draft → user submits → goes through approval
    return transfer;
  }

  async findAllTransfers(companyId: number, bankId?: number): Promise<BankTransfer[]> {
    let sql = `
      SELECT bt.*,
        b1.name as "fromBankName",
        b2.name as "toBankName",
        b1."currencyCode" as "fromBankCurrency",
        b2."currencyCode" as "toBankCurrency",
        (SELECT step->>'name' FROM process_approval_statuses pas,
         jsonb_array_elements(pas.steps) AS step
         WHERE pas."approvableType" = 'bank_transfers'
           AND pas."approvableId" = bt.id
           AND step->>'status' = 'PENDING'
         LIMIT 1
        ) as "pendingStepName"
      FROM bank_transfers bt
      JOIN banks b1 ON b1.id = bt."fromBankId"
      JOIN banks b2 ON b2.id = bt."toBankId"
      WHERE b1."companyId" = $1 OR b2."companyId" = $1
    `;
    const params: any[] = [companyId];

    if (bankId) {
      sql += ` AND (bt."fromBankId" = $2 OR bt."toBankId" = $2)`;
      params.push(bankId);
    }

    sql += ` ORDER BY bt."transferDate" DESC, bt.id DESC`;

    return this.tenantPrisma.query<BankTransfer>(sql, params);
  }

  // ============================================================================
  // BANK TRANSFERS (Enhanced Multi-Item Workflow)
  // ============================================================================

  private async generateTransferNumber(companyId: number): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const lastTransfer = await this.tenantPrisma.queryOne<{ transferNumber: string }>(
      `SELECT "transferNumber" FROM bank_transfers
       WHERE "companyId" = $1 AND "transferNumber" LIKE $2
       ORDER BY id DESC LIMIT 1`,
      [companyId, `BTF-${dateStr}-%`],
    );

    let seq = 1;
    if (lastTransfer) {
      const parts = lastTransfer.transferNumber.split('-');
      seq = parseInt(parts[2], 10) + 1;
    }

    return `BTF-${dateStr}-${String(seq).padStart(4, '0')}`;
  }

  async createTransferEnhanced(
    companyId: number,
    dto: CreateBankTransferDto,
    userId: number,
  ): Promise<BankTransfer> {
    // Validate from bank
    const fromBank = await this.findBankById(companyId, dto.fromBankId);
    if (!fromBank.isActive) {
      throw new BadRequestException('Source bank is inactive');
    }

    // Validate to bank
    const toBank = await this.findBankById(companyId, dto.toBankId);
    if (!toBank.isActive) {
      throw new BadRequestException('Destination bank is inactive');
    }

    if (dto.fromBankId === dto.toBankId) {
      throw new BadRequestException('Cannot transfer to the same bank');
    }

    // Calculate total amount from items
    const totalAmount = dto.items.reduce((sum, item) => sum + item.amount, 0);
    if (totalAmount <= 0) {
      throw new BadRequestException('Total transfer amount must be positive');
    }

    const transferNumber = await this.generateTransferNumber(companyId);

    return this.tenantPrisma.transaction(async (client) => {
      // Create transfer header
      const result = await client.query(
        `INSERT INTO bank_transfers
         ("companyId", "fromBankId", "toBankId", "transferNumber", amount, "totalAmount",
          "currencyId", "exchangeRate", "transferDate", reference, description, status,
          "createdBy", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft', $12, NOW(), NOW())
         RETURNING *`,
        [
          companyId,
          dto.fromBankId,
          dto.toBankId,
          transferNumber,
          totalAmount,
          totalAmount,
          dto.currencyId || null,
          dto.exchangeRate || 1,
          dto.transferDate,
          dto.reference || null,
          dto.description || null,
          userId,
        ],
      );

      const transfer = result.rows[0];

      // Create transfer items
      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i];
        await client.query(
          `INSERT INTO bank_transfer_items
           ("bankTransferId", "lineNumber", "transferType", "sourceAccountId", "sourceBankId",
            "destinationBankId", "destinationAccountId", amount, description, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
          [
            transfer.id,
            i + 1,
            item.transferType,
            item.sourceAccountId,
            item.sourceBankId || null,
            item.destinationBankId,
            item.destinationAccountId,
            item.amount,
            item.description || null,
          ],
        );
      }

      return this.findTransferById(companyId, transfer.id);
    }, { isolationLevel: 'SERIALIZABLE' });
  }

  async updateTransferEnhanced(
    companyId: number,
    transferId: number,
    dto: UpdateBankTransferDto,
    userId: number,
  ): Promise<BankTransfer> {
    const transfer = await this.findTransferById(companyId, transferId);

    if (transfer.status !== 'draft') {
      throw new BadRequestException('Can only update draft transfers');
    }

    return this.tenantPrisma.transaction(async (client) => {
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (dto.transferDate !== undefined) {
        updateFields.push(`"transferDate" = $${paramIndex++}`);
        updateValues.push(dto.transferDate);
      }
      if (dto.reference !== undefined) {
        updateFields.push(`reference = $${paramIndex++}`);
        updateValues.push(dto.reference);
      }
      if (dto.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(dto.description);
      }
      if (dto.currencyId !== undefined) {
        updateFields.push(`"currencyId" = $${paramIndex++}`);
        updateValues.push(dto.currencyId);
      }
      if (dto.exchangeRate !== undefined) {
        updateFields.push(`"exchangeRate" = $${paramIndex++}`);
        updateValues.push(dto.exchangeRate);
      }

      // Update items if provided
      if (dto.items && dto.items.length > 0) {
        await client.query(
          `DELETE FROM bank_transfer_items WHERE "bankTransferId" = $1`,
          [transferId],
        );

        const totalAmount = dto.items.reduce((sum, item) => sum + item.amount, 0);
        updateFields.push(`amount = $${paramIndex++}`);
        updateValues.push(totalAmount);
        updateFields.push(`"totalAmount" = $${paramIndex++}`);
        updateValues.push(totalAmount);

        for (let i = 0; i < dto.items.length; i++) {
          const item = dto.items[i];
          await client.query(
            `INSERT INTO bank_transfer_items
             ("bankTransferId", "lineNumber", "transferType", "sourceAccountId", "sourceBankId",
              "destinationBankId", "destinationAccountId", amount, description, "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
            [
              transferId,
              i + 1,
              item.transferType,
              item.sourceAccountId,
              item.sourceBankId || null,
              item.destinationBankId,
              item.destinationAccountId,
              item.amount,
              item.description || null,
            ],
          );
        }
      }

      if (updateFields.length > 0) {
        updateFields.push(`"updatedBy" = $${paramIndex++}`);
        updateValues.push(userId);
        updateFields.push(`"updatedAt" = NOW()`);
        updateValues.push(transferId);

        await client.query(
          `UPDATE bank_transfers SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
          updateValues,
        );
      }

      return this.findTransferById(companyId, transferId);
    }, { isolationLevel: 'SERIALIZABLE' });
  }

  async deleteTransfer(companyId: number, transferId: number): Promise<void> {
    const transfer = await this.findTransferById(companyId, transferId);

    const deletableStatuses = ['draft', 'pending', 'rejected'];
    if (!deletableStatuses.includes(transfer.status)) {
      throw new BadRequestException('Can only delete draft, pending, or rejected transfers');
    }

    await this.tenantPrisma.transaction(async (client) => {
      await client.query(
        `DELETE FROM bank_transfer_items WHERE "bankTransferId" = $1`,
        [transferId],
      );
      await client.query(
        `DELETE FROM bank_transfers WHERE id = $1 AND "companyId" = $2`,
        [transferId, companyId],
      );
    }, { isolationLevel: 'SERIALIZABLE' });
  }

  async findTransferById(companyId: number, transferId: number): Promise<BankTransfer> {
    const transfer = await this.tenantPrisma.queryOne<BankTransfer>(
      `SELECT bt.*,
         b1.name as "fromBankName",
         b2.name as "toBankName"
       FROM bank_transfers bt
       JOIN banks b1 ON b1.id = bt."fromBankId"
       JOIN banks b2 ON b2.id = bt."toBankId"
       WHERE bt.id = $1 AND bt."companyId" = $2`,
      [transferId, companyId],
    );

    if (!transfer) {
      throw new NotFoundException('Bank transfer not found');
    }

    // Get items
    const items = await this.tenantPrisma.query<BankTransferItem>(
      `SELECT bti.*,
         sa.name as "sourceAccountName",
         da.name as "destinationAccountName"
       FROM bank_transfer_items bti
       LEFT JOIN ifrs_accounts sa ON sa.id = bti."sourceAccountId"
       LEFT JOIN ifrs_accounts da ON da.id = bti."destinationAccountId"
       WHERE bti."bankTransferId" = $1
       ORDER BY bti."lineNumber" ASC`,
      [transferId],
    );

    return { ...transfer, items };
  }

  async findAllTransfersEnhanced(
    companyId: number,
    query: BankTransferQueryDto,
  ): Promise<{ data: BankTransfer[]; total: number; page: number; limit: number }> {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT bt.*,
        b1.name as "fromBankName",
        b2.name as "toBankName",
        b1."currencyCode" as "fromBankCurrency",
        b2."currencyCode" as "toBankCurrency",
        (SELECT step->>'name' FROM process_approval_statuses pas,
         jsonb_array_elements(pas.steps) AS step
         WHERE pas."approvableType" = 'bank_transfers'
           AND pas."approvableId" = bt.id
           AND step->>'status' = 'PENDING'
         LIMIT 1
        ) as "pendingStepName"
      FROM bank_transfers bt
      JOIN banks b1 ON b1.id = bt."fromBankId"
      JOIN banks b2 ON b2.id = bt."toBankId"
      WHERE bt."companyId" = $1
    `;
    let countSql = `SELECT COUNT(*) as count FROM bank_transfers WHERE "companyId" = $1`;
    const params: any[] = [companyId];
    let paramIndex = 2;

    if (query.status) {
      sql += ` AND bt.status = $${paramIndex}`;
      countSql += ` AND status = $${paramIndex}`;
      params.push(query.status);
      paramIndex++;
    }

    if (query.bankId) {
      sql += ` AND (bt."fromBankId" = $${paramIndex} OR bt."toBankId" = $${paramIndex})`;
      countSql += ` AND ("fromBankId" = $${paramIndex} OR "toBankId" = $${paramIndex})`;
      params.push(query.bankId);
      paramIndex++;
    }

    if (query.fromDate) {
      sql += ` AND bt."transferDate" >= $${paramIndex}`;
      countSql += ` AND "transferDate" >= $${paramIndex}`;
      params.push(query.fromDate);
      paramIndex++;
    }

    if (query.toDate) {
      sql += ` AND bt."transferDate" <= $${paramIndex}`;
      countSql += ` AND "transferDate" <= $${paramIndex}`;
      params.push(query.toDate);
      paramIndex++;
    }

    if (query.search) {
      sql += ` AND (bt."transferNumber" ILIKE $${paramIndex} OR bt.reference ILIKE $${paramIndex} OR bt.description ILIKE $${paramIndex})`;
      countSql += ` AND ("transferNumber" ILIKE $${paramIndex} OR reference ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY bt."transferDate" DESC, bt.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const [data, countResult] = await Promise.all([
      this.tenantPrisma.query<BankTransfer>(sql, params),
      this.tenantPrisma.queryOne<{ count: string }>(countSql, params.slice(0, -2)),
    ]);

    return {
      data,
      total: parseInt(countResult?.count || '0', 10),
      page,
      limit,
    };
  }

  async submitTransfer(
    companyId: number,
    transferId: number,
    userId: number,
  ): Promise<BankTransfer> {
    const transfer = await this.findTransferById(companyId, transferId);

    if (transfer.status !== 'draft') {
      throw new BadRequestException('Can only submit draft transfers');
    }

    // Initiate configurable approval flow — must succeed before changing status
    if (this.approvalService) {
      await this.approvalService.initiateApproval(
        { processType: 'bank_transfers', recordId: transferId, companyId },
        userId,
      );
    }

    await this.tenantPrisma.query(
      `UPDATE bank_transfers SET status = 'pending', "updatedBy" = $1, "updatedAt" = NOW() WHERE id = $2`,
      [userId, transferId],
    );

    // Notify the creator
    if (transfer.createdBy) {
      await this.createNotification(companyId, transfer.createdBy, 'financial', {
        title: 'Bank Transfer Submitted',
        message: `Bank transfer ${transfer.transferNumber} (₦${Number(transfer.totalAmount || transfer.amount).toLocaleString()}) has been submitted for approval.`,
        url: `/accounts/bank-transfers?view=${transferId}`,
      });
    }

    return this.findTransferById(companyId, transferId);
  }

  async approveTransfer(
    companyId: number,
    transferId: number,
    userId: number,
    dto: ApproveBankTransferDto,
  ): Promise<BankTransfer> {
    const transfer = await this.findTransferById(companyId, transferId);

    if (transfer.status !== 'pending' && transfer.status !== 'approved') {
      throw new BadRequestException('Can only approve pending or approved transfers');
    }

    // Advance configurable approval flow if tracking exists
    // When all steps complete, syncApprovalToEntity (in approval service) handles:
    //   - Setting bank_transfers.status to 'approved'
    //   - Posting GL (sets status to 'posted')
    //   - All in one atomic flow
    if (this.approvalService) {
      const allDone = await this.approvalService.advanceByProcessType('bank_transfers', transferId, userId, dto.notes);
      if (allDone) {
        // syncApprovalToEntity already handled status + GL posting
        // Just notify the creator
        const updated = await this.findTransferById(companyId, transferId);
        if (transfer.createdBy && transfer.createdBy !== userId) {
          const isPosted = updated.status === 'posted';
          await this.createNotification(companyId, transfer.createdBy, 'financial', {
            title: isPosted ? 'Bank Transfer Posted' : 'Bank Transfer Approved',
            message: `Bank transfer ${transfer.transferNumber} (₦${Number(transfer.totalAmount || transfer.amount).toLocaleString()}) has been ${isPosted ? 'approved and posted to GL' : 'approved'}.`,
            url: `/accounts/bank-transfers?view=${transferId}`,
          });
        }
        return updated;
      }
      // More steps remain
      return this.findTransferById(companyId, transferId);
    }

    // No approval service — approve and post directly (shouldn't happen in production)
    await this.tenantPrisma.query(
      `UPDATE bank_transfers
       SET status = 'approved', "approvedBy" = $1, "approvedAt" = NOW(), "updatedAt" = NOW()
       WHERE id = $2`,
      [userId, transferId],
    );
    return this.postTransfer(companyId, transferId, userId);
  }

  async rejectTransfer(
    companyId: number,
    transferId: number,
    userId: number,
    dto: RejectBankTransferDto,
  ): Promise<BankTransfer> {
    const transfer = await this.findTransferById(companyId, transferId);

    if (transfer.status !== 'pending') {
      throw new BadRequestException('Can only reject pending transfers');
    }

    await this.tenantPrisma.query(
      `UPDATE bank_transfers
       SET status = 'draft', "approvalNotes" = $1, "updatedBy" = $2, "updatedAt" = NOW()
       WHERE id = $3`,
      [dto.reason, userId, transferId],
    );

    // Notify the creator
    if (transfer.createdBy && transfer.createdBy !== userId) {
      await this.createNotification(companyId, transfer.createdBy, 'financial', {
        title: 'Bank Transfer Returned to Draft',
        message: `Bank transfer ${transfer.transferNumber} (₦${Number(transfer.totalAmount || transfer.amount).toLocaleString()}) has been returned to draft. Reason: ${dto.reason}`,
        url: `/accounts/bank-transfers?view=${transferId}`,
      });
    }

    return this.findTransferById(companyId, transferId);
  }

  async postTransfer(
    companyId: number,
    transferId: number,
    userId: number,
  ): Promise<BankTransfer> {
    const transfer = await this.findTransferById(companyId, transferId);

    if (transfer.status !== 'approved') {
      throw new BadRequestException('Can only post approved transfers');
    }

    // Post GL for the bank transfer — validate both bank accounts upfront
    const { validateGLAccounts } = require('../../../common/utils/gl-account-validator');
    const glValidation = await validateGLAccounts(
      this.tenantPrisma, companyId, 'bank_transfer',
      { bankId: transfer.fromBankId, destBankId: transfer.toBankId },
    );
    const sourceBankGlId = glValidation.accounts.sourceBank;
    const destBankGlId = glValidation.accounts.destBank;

    // Still need bank names/currencies for narration — fetch them
    const fromBank = await this.tenantPrisma.queryOne<{ currencyCode: string; name: string }>(
      `SELECT "currencyCode", name FROM banks WHERE id = $1`, [transfer.fromBankId],
    );
    const toBank = await this.tenantPrisma.queryOne<{ currencyCode: string; name: string }>(
      `SELECT "currencyCode", name FROM banks WHERE id = $1`, [transfer.toBankId],
    );

    let journalEntryId: number | null = null;

    {
      const { postToGL } = require('../../../common/utils/gl-posting');
      const { toMoney } = require('../../../common/utils/decimal');

        const isForeign = (transfer as unknown as Record<string, unknown>).transferType === 'foreign';
        const amount = toMoney(transfer.amount);
        const rate = Number(transfer.exchangeRate || 1);
        const bankCharges = toMoney(Number((transfer as unknown as Record<string, unknown>).bankCharges) || 0);

        const glLines: { accountId: number; debit: number; credit: number; narration?: string }[] = [];

        if (isForeign) {
          // Foreign transfer: source and destination may be different amounts
          const sourceAmount = amount; // amount in source currency
          const destAmount = toMoney(Number((transfer as unknown as Record<string, unknown>).destinationAmount) || sourceAmount * rate);

          // DR: Destination bank (amount received)
          glLines.push({ accountId: destBankGlId, debit: destAmount, credit: 0, narration: `Transfer in from ${fromBank?.name} (${fromBank?.currencyCode})` });
          // CR: Source bank (amount sent + bank charges)
          glLines.push({ accountId: sourceBankGlId, debit: 0, credit: toMoney(sourceAmount + bankCharges), narration: `Transfer out to ${toBank?.name} (${toBank?.currencyCode})` });

          // Bank charges: DR expense account (selected by creator)
          if (bankCharges > 0) {
            const selectedChargesAcctId = (transfer as unknown as Record<string, unknown>).chargesAccountId as number | null;
            if (selectedChargesAcctId) {
              glLines.push({ accountId: selectedChargesAcctId, debit: bankCharges, credit: 0, narration: `Bank charges/commission — ${transfer.transferNumber}` });
            } else {
              // Fallback to auto-resolved account
              const { resolveGlAccountOptional } = require('../../../common/utils/gl-account-resolver');
              const bankChargesAcct = await resolveGlAccountOptional(this.tenantPrisma, companyId, 'bank_charges');
              if (bankChargesAcct) {
                glLines.push({ accountId: bankChargesAcct.id, debit: bankCharges, credit: 0, narration: `Bank charges — ${transfer.transferNumber}` });
              } else {
                this.logger.error(`Bank Charges GL account not found — ₦${bankCharges} charges CANNOT be posted for ${transfer.transferNumber}. Create a "Bank Charges" GL account.`);
                throw new Error(`Bank Charges GL account not configured — cannot post ₦${bankCharges} charges. Create an account with category "bank_charges".`);
              }
            }
          }

          // Forex gain/loss: difference between source*rate and destination
          const expectedDest = toMoney(sourceAmount * rate);
          const forexDiff = toMoney(destAmount - expectedDest);
          if (Math.abs(forexDiff) > 0.01) {
            const { resolveGlAccountOptional: resolveForex } = require('../../../common/utils/gl-account-resolver');
            const forexAcct = await resolveForex(this.tenantPrisma, companyId, 'forex_gain_loss');
            if (forexAcct) {
              if (forexDiff > 0) {
                glLines.push({ accountId: forexAcct.id, debit: 0, credit: forexDiff, narration: `Forex gain — ${transfer.transferNumber}` });
              } else {
                glLines.push({ accountId: forexAcct.id, debit: Math.abs(forexDiff), credit: 0, narration: `Forex loss — ${transfer.transferNumber}` });
              }
            } else {
              this.logger.error(`Forex Gain/Loss GL account not found — ${forexDiff} CANNOT be posted for ${transfer.transferNumber}. Create a "Forex Gain/Loss" GL account.`);
              throw new Error(`Forex Gain/Loss GL account not configured — cannot post ${forexDiff}. Create an account with category "forex_gain_loss".`);
            }
            // Store forex gain/loss on the transfer
            await this.tenantPrisma.query(
              `UPDATE bank_transfers SET "forexGainLoss" = $1 WHERE id = $2`,
              [forexDiff, transferId],
            );
          }
        } else {
          // Local transfer: same amount in and out
          glLines.push({ accountId: destBankGlId, debit: amount, credit: 0, narration: `Transfer in from ${fromBank?.name}` });
          glLines.push({ accountId: sourceBankGlId, debit: 0, credit: amount, narration: `Transfer out to ${toBank?.name}` });
        }

        const result = await postToGL(this.tenantPrisma, {
          companyId,
          entryDate: new Date(transfer.transferDate),
          reference: transfer.transferNumber,
          narration: `Bank Transfer ${transfer.transferNumber} — ${fromBank?.name} (${fromBank?.currencyCode}) → ${toBank?.name} (${toBank?.currencyCode})`,
          sourceType: 'bank_transfer',
          sourceId: transferId,
          journalType: 'general',
          lines: glLines,
        });

        if (result) {
          journalEntryId = result.journalEntryId;
          this.logger.log(`GL posted for bank transfer ${transfer.transferNumber}: JE ${result.entryNumber}`);
        }
    }

    await this.tenantPrisma.query(
      `UPDATE bank_transfers
       SET status = 'posted', "postedBy" = $1, "postedAt" = NOW(), "completedAt" = NOW(),
           "journalEntryId" = $2, "updatedBy" = $1, "updatedAt" = NOW()
       WHERE id = $3`,
      [userId, journalEntryId, transferId],
    );

    // Notify the creator
    if (transfer.createdBy && transfer.createdBy !== userId) {
      await this.createNotification(companyId, transfer.createdBy, 'financial', {
        title: 'Bank Transfer Posted',
        message: `Bank transfer ${transfer.transferNumber} has been posted.`,
        url: `/accounts/bank-transfers?view=${transferId}`,
      });
    }

    return this.findTransferById(companyId, transferId);
  }

  async cancelTransfer(
    companyId: number,
    transferId: number,
    userId: number,
  ): Promise<BankTransfer> {
    const transfer = await this.findTransferById(companyId, transferId);

    if (!['draft', 'pending', 'approved'].includes(transfer.status)) {
      throw new BadRequestException('Cannot cancel posted or already cancelled transfers');
    }

    await this.tenantPrisma.query(
      `UPDATE bank_transfers
       SET status = 'cancelled', "updatedBy" = $1, "updatedAt" = NOW()
       WHERE id = $2`,
      [userId, transferId],
    );

    return this.findTransferById(companyId, transferId);
  }

  private async createNotification(
    companyId: number,
    userId: number,
    type: string,
    data: { title: string; message: string; url?: string },
  ): Promise<void> {
    try {
      await this.tenantPrisma.query(
        `INSERT INTO notifications (id, type, "notifiableType", "notifiableId", data, "companyId", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, 'User', $2, $3, $4, NOW(), NOW())`,
        [type, userId, JSON.stringify(data), companyId],
      );
    } catch (err) {
      this.logger.warn(`Failed to create notification: ${err}`);
    }
  }

  async getCashAccounts(companyId: number): Promise<Array<{ id: number; code: string; name: string }>> {
    return this.tenantPrisma.query(
      `SELECT id, code, name FROM ifrs_accounts
       WHERE "companyId" = $1 AND "isActive" = true AND "deletedAt" IS NULL
         AND (name ILIKE '%cash%' OR name ILIKE '%petty%' OR name ILIKE '%bank%')
       ORDER BY code ASC`,
      [companyId],
    );
  }

  // ============================================================================
  // BANK RECONCILIATIONS
  // ============================================================================

  async createReconciliation(
    companyId: number,
    dto: CreateBankReconciliationDto,
    userId: number,
  ): Promise<BankReconciliation> {
    const bank = await this.findBankById(companyId, dto.bankId);

    const data = dto as any;
    return this.tenantPrisma.insert<BankReconciliation>('bank_reconciliations', {
      companyId,
      branchId: dto.branchId || null,
      bankId: dto.bankId,
      periodStart: dto.reconciliationDate || data.periodStart,
      periodEnd: dto.statementDate || data.periodEnd,
      statementBalance: dto.statementBalance,
      bookBalance: dto.bookBalance ?? 0,
      status: 'draft',
    });
  }

  async updateReconciliation(
    companyId: number,
    reconciliationId: number,
    dto: UpdateBankReconciliationDto,
    userId: number,
  ): Promise<BankReconciliation> {
    const reconciliation = await this.findReconciliationById(companyId, reconciliationId);

    if (reconciliation.status === 'completed') {
      throw new BadRequestException('Cannot update completed reconciliation');
    }

    const data = dto as any;
    const updateData: Record<string, any> = {};
    if (dto.statementBalance !== undefined) updateData.statementBalance = dto.statementBalance;
    if (dto.bookBalance !== undefined) updateData.bookBalance = dto.bookBalance;
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'completed') {
        updateData.reconciliationDate = new Date();
        updateData.reconciledBy = userId;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return reconciliation;
    }

    const updated = await this.tenantPrisma.update<BankReconciliation>(
      'bank_reconciliations',
      reconciliationId,
      updateData,
    );

    if (!updated) {
      throw new NotFoundException('Bank reconciliation not found');
    }

    return updated;
  }

  async findReconciliationById(companyId: number, reconciliationId: number): Promise<BankReconciliation> {
    const reconciliation = await this.tenantPrisma.queryOne<BankReconciliation>(
      `SELECT * FROM bank_reconciliations WHERE id = $1 AND "companyId" = $2`,
      [reconciliationId, companyId],
    );

    if (!reconciliation) {
      throw new NotFoundException('Bank reconciliation not found');
    }

    return reconciliation;
  }

  async findAllReconciliations(companyId: number, bankId?: number): Promise<BankReconciliation[]> {
    let sql = `SELECT * FROM bank_reconciliations WHERE "companyId" = $1`;
    const params: any[] = [companyId];

    if (bankId) {
      sql += ` AND "bankId" = $2`;
      params.push(bankId);
    }

    sql += ` ORDER BY "reconciliationDate" DESC`;

    return this.tenantPrisma.query<BankReconciliation>(sql, params);
  }
}
