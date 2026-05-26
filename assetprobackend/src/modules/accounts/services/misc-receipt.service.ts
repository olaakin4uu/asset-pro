import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import {
  CreateMiscReceiptDto,
  UpdateMiscReceiptDto,
  MiscReceiptQueryDto,
  MiscReceiptResponseDto,
} from '../dto/misc-receipt.dto';

@Injectable()
export class MiscReceiptService {
  private readonly logger = new Logger(MiscReceiptService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // ============================================================================
  // HELPERS
  // ============================================================================

  private mapToResponse(row: Record<string, unknown>): MiscReceiptResponseDto {
    return {
      id: row['id'] as number,
      companyId: row['companyId'] as number,
      receiptNumber: row['receiptNumber'] as string,
      bankId: row['bankId'] as number,
      bankName: (row['bankName'] as string) || '',
      glAccountId: row['glAccountId'] as number,
      glAccountCode: (row['glAccountCode'] as string) || '',
      glAccountName: (row['glAccountName'] as string) || '',
      amount: Number(row['amount'] ?? 0),
      receiptDate: row['receiptDate'] as string,
      description: row['description'] as string,
      reference: (row['reference'] as string) || null,
      status: row['status'] as string,
      journalEntryId: (row['journalEntryId'] as number) || null,
      postedBy: (row['postedBy'] as number) || null,
      postedAt: row['postedAt'] ? String(row['postedAt']) : null,
      createdById: (row['createdById'] as number) || null,
      createdAt: String(row['createdAt']),
      updatedAt: String(row['updatedAt']),
    };
  }

  private async generateReceiptNumber(companyId: number): Promise<string> {
    const result = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) AS count FROM misc_receipts WHERE "companyId" = $1`,
      [companyId],
    );
    const seq = (parseInt(result?.count || '0') + 1).toString().padStart(4, '0');
    const year = new Date().getFullYear();
    return `MR-${year}-${seq}`;
  }

  private async fetchFullRow(companyId: number, id: number): Promise<MiscReceiptResponseDto> {
    const row = await this.tenantPrisma.queryOne<Record<string, unknown>>(
      `SELECT mr.*,
              b.name AS "bankName",
              a.code AS "glAccountCode", a.name AS "glAccountName"
       FROM misc_receipts mr
       LEFT JOIN banks b ON b.id = mr."bankId"
       LEFT JOIN ifrs_accounts a ON a.id = mr."glAccountId"
       WHERE mr.id = $1 AND mr."companyId" = $2`,
      [id, companyId],
    );
    if (!row) throw new NotFoundException('Misc receipt not found');
    return this.mapToResponse(row);
  }

  // ============================================================================
  // CRUD
  // ============================================================================

  async create(companyId: number, userId: number, dto: CreateMiscReceiptDto): Promise<MiscReceiptResponseDto> {
    // Validate bank
    const bank = await this.tenantPrisma.queryOne<{ id: number; glAccountId: number | null; name: string }>(
      `SELECT id, "glAccountId", name FROM banks WHERE id = $1 AND "companyId" = $2 AND "deletedAt" IS NULL`,
      [dto.bankId, companyId],
    );
    if (!bank) throw new BadRequestException('Bank not found');
    if (!bank.glAccountId) throw new BadRequestException(`Bank "${bank.name}" has no GL account configured`);

    // Validate GL account — must be posting-enabled
    const glAccount = await this.tenantPrisma.queryOne<{ id: number; isPosting: boolean }>(
      `SELECT id, "isPosting" FROM ifrs_accounts WHERE id = $1 AND "companyId" = $2`,
      [dto.glAccountId, companyId],
    );
    if (!glAccount) throw new BadRequestException('GL account not found');
    if (!glAccount.isPosting) throw new BadRequestException('Selected GL account is not a posting-level account');

    const receiptNumber = await this.generateReceiptNumber(companyId);

    const row = await this.tenantPrisma.insert('misc_receipts', {
      companyId,
      receiptNumber,
      bankId: dto.bankId,
      glAccountId: dto.glAccountId,
      amount: dto.amount,
      receiptDate: new Date(dto.receiptDate),
      description: dto.description,
      reference: dto.reference || null,
      status: 'draft',
      journalEntryId: null,
      postedBy: null,
      postedAt: null,
      createdById: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.fetchFullRow(companyId, row.id);
  }

  async findAll(companyId: number, query: MiscReceiptQueryDto): Promise<{
    data: MiscReceiptResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;

    let where = `WHERE mr."companyId" = $1 AND mr."deletedAt" IS NULL`;
    const params: unknown[] = [companyId];
    let p = 2;

    if (query.status) {
      where += ` AND mr.status = $${p++}`;
      params.push(query.status);
    }
    if (query.search) {
      where += ` AND (mr."receiptNumber" ILIKE $${p} OR mr.description ILIKE $${p} OR mr.reference ILIKE $${p} OR b.name ILIKE $${p})`;
      params.push(`%${query.search}%`);
      p++;
    }
    if (query.startDate) {
      where += ` AND mr."receiptDate" >= $${p++}`;
      params.push(query.startDate);
    }
    if (query.endDate) {
      where += ` AND mr."receiptDate" <= $${p++}`;
      params.push(query.endDate);
    }

    const countRow = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM misc_receipts mr
       LEFT JOIN banks b ON b.id = mr."bankId"
       ${where}`,
      params,
    );
    const total = parseInt(countRow?.count || '0');

    params.push(limit, offset);
    const rows = await this.tenantPrisma.query<Record<string, unknown>>(
      `SELECT mr.*,
              b.name AS "bankName",
              a.code AS "glAccountCode", a.name AS "glAccountName"
       FROM misc_receipts mr
       LEFT JOIN banks b ON b.id = mr."bankId"
       LEFT JOIN ifrs_accounts a ON a.id = mr."glAccountId"
       ${where}
       ORDER BY mr."receiptDate" DESC, mr.id DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      params,
    );

    return {
      data: rows.map((r) => this.mapToResponse(r)),
      total,
      page,
      limit,
    };
  }

  async findOne(companyId: number, id: number): Promise<MiscReceiptResponseDto> {
    return this.fetchFullRow(companyId, id);
  }

  async update(companyId: number, id: number, dto: UpdateMiscReceiptDto): Promise<MiscReceiptResponseDto> {
    const existing = await this.tenantPrisma.queryOne<{ id: number; status: string }>(
      `SELECT id, status FROM misc_receipts WHERE id = $1 AND "companyId" = $2 AND "deletedAt" IS NULL`,
      [id, companyId],
    );
    if (!existing) throw new NotFoundException('Misc receipt not found');
    if (existing.status === 'posted') throw new BadRequestException('Posted receipts cannot be edited');

    if (dto.bankId) {
      const bank = await this.tenantPrisma.queryOne<{ id: number; glAccountId: number | null; name: string }>(
        `SELECT id, "glAccountId", name FROM banks WHERE id = $1 AND "companyId" = $2 AND "deletedAt" IS NULL`,
        [dto.bankId, companyId],
      );
      if (!bank) throw new BadRequestException('Bank not found');
      if (!bank.glAccountId) throw new BadRequestException(`Bank "${bank.name}" has no GL account configured`);
    }

    if (dto.glAccountId) {
      const glAccount = await this.tenantPrisma.queryOne<{ id: number; isPosting: boolean }>(
        `SELECT id, "isPosting" FROM ifrs_accounts WHERE id = $1 AND "companyId" = $2`,
        [dto.glAccountId, companyId],
      );
      if (!glAccount) throw new BadRequestException('GL account not found');
      if (!glAccount.isPosting) throw new BadRequestException('Selected GL account is not a posting-level account');
    }

    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.bankId !== undefined) data['bankId'] = dto.bankId;
    if (dto.glAccountId !== undefined) data['glAccountId'] = dto.glAccountId;
    if (dto.amount !== undefined) data['amount'] = dto.amount;
    if (dto.receiptDate !== undefined) data['receiptDate'] = new Date(dto.receiptDate);
    if (dto.description !== undefined) data['description'] = dto.description;
    if (dto.reference !== undefined) data['reference'] = dto.reference || null;

    if (Object.keys(data).length > 1) {
      await this.tenantPrisma.update('misc_receipts', id, data);
    }

    return this.fetchFullRow(companyId, id);
  }

  async delete(companyId: number, id: number): Promise<void> {
    const existing = await this.tenantPrisma.queryOne<{ id: number; status: string }>(
      `SELECT id, status FROM misc_receipts WHERE id = $1 AND "companyId" = $2 AND "deletedAt" IS NULL`,
      [id, companyId],
    );
    if (!existing) throw new NotFoundException('Misc receipt not found');
    if (existing.status === 'posted') throw new BadRequestException('Posted receipts cannot be deleted');

    await this.tenantPrisma.update('misc_receipts', id, { deletedAt: new Date() });
  }

  // ============================================================================
  // POST TO GL
  // ============================================================================

  async post(companyId: number, id: number, userId: number): Promise<MiscReceiptResponseDto> {
    const receipt = await this.fetchFullRow(companyId, id);

    if (receipt.status !== 'draft') {
      throw new BadRequestException(`Receipt is already ${receipt.status}`);
    }

    // Resolve bank GL account
    const bank = await this.tenantPrisma.queryOne<{ glAccountId: number; name: string }>(
      `SELECT "glAccountId", name FROM banks WHERE id = $1`,
      [receipt.bankId],
    );
    if (!bank?.glAccountId) throw new BadRequestException('Bank GL account not configured');

    const { postToGL } = require('../../../common/utils/gl-posting');
    const { toMoney } = require('../../../common/utils/decimal');

    const amount = toMoney(receipt.amount);

    const result = await postToGL(this.tenantPrisma, {
      companyId,
      entryDate: new Date(receipt.receiptDate),
      reference: receipt.reference || receipt.receiptNumber,
      narration: receipt.description,
      sourceType: 'misc_receipt',
      sourceId: id,
      lines: [
        // DR Bank
        {
          accountId: bank.glAccountId,
          debit: amount,
          credit: 0,
          narration: `${receipt.description} — ${receipt.receiptNumber}`,
        },
        // CR GL Account
        {
          accountId: receipt.glAccountId,
          debit: 0,
          credit: amount,
          narration: `${receipt.description} — ${receipt.receiptNumber}`,
        },
      ],
    });

    await this.tenantPrisma.update('misc_receipts', id, {
      status: 'posted',
      journalEntryId: result!.journalEntryId,
      postedBy: userId,
      postedAt: new Date(),
      updatedAt: new Date(),
    });

    this.logger.log(`Misc receipt ${receipt.receiptNumber} posted by user ${userId} — JE #${result!.journalEntryId}`);

    return this.fetchFullRow(companyId, id);
  }

  // ============================================================================
  // STATS
  // ============================================================================

  async getStats(companyId: number): Promise<{
    total: number;
    draft: number;
    posted: number;
    totalAmount: number;
    postedAmount: number;
  }> {
    const row = await this.tenantPrisma.queryOne<Record<string, unknown>>(
      `SELECT
         COUNT(*) FILTER (WHERE "deletedAt" IS NULL) AS total,
         COUNT(*) FILTER (WHERE status = 'draft' AND "deletedAt" IS NULL) AS draft,
         COUNT(*) FILTER (WHERE status = 'posted' AND "deletedAt" IS NULL) AS posted,
         COALESCE(SUM(amount) FILTER (WHERE "deletedAt" IS NULL), 0) AS "totalAmount",
         COALESCE(SUM(amount) FILTER (WHERE status = 'posted' AND "deletedAt" IS NULL), 0) AS "postedAmount"
       FROM misc_receipts
       WHERE "companyId" = $1`,
      [companyId],
    );
    return {
      total: parseInt(String(row?.['total'] ?? 0)),
      draft: parseInt(String(row?.['draft'] ?? 0)),
      posted: parseInt(String(row?.['posted'] ?? 0)),
      totalAmount: Number(row?.['totalAmount'] ?? 0),
      postedAmount: Number(row?.['postedAmount'] ?? 0),
    };
  }
}
