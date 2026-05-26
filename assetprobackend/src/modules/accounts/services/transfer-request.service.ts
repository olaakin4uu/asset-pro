import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { numberToNairaWords } from '../../../common/utils/number-to-words';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

interface BeneficiaryRow {
  name: string;
  bank: string;
  accountNumber: string;
  amount: number;
  description: string;
}

interface TransferRequestData {
  company: {
    name: string;
    logo?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    phone?: string;
    email?: string;
  };
  requestDate: string;
  bankName: string;
  bankBranch?: string;
  bankCity?: string;
  sourceAccountNumber: string;
  currencySymbol: string;
  totalAmount: number;
  totalAmountInWords: string;
  beneficiaries: BeneficiaryRow[];
  signatory: string;
  signatorySignature?: string;
  generatedAt: string;
}

@Injectable()
export class TransferRequestService {
  private readonly logger = new Logger(TransferRequestService.name);
  private templateCache: string | null = null;

  constructor(private readonly tenantPrisma: TenantPrismaService) {
    this.registerHandlebarsHelpers();
  }

  private registerHandlebarsHelpers(): void {

    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const ordinal = (n: number) => {
      const s = ['th','st','nd','rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    Handlebars.registerHelper('date', function (value: unknown, format?: string) {
      if (!value) return '';
      const d = new Date(value as string);
      if (isNaN(d.getTime())) return '';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours24 = d.getHours();
      const hours12 = hours24 % 12 || 12;
      const mins = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours24 >= 12 ? 'PM' : 'AM';

      switch (format) {
        case 'DD/MM/YYYY': return `${day}/${month}/${year}`;
        case 'MM/DD/YYYY': return `${month}/${day}/${year}`;
        case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
        case 'h:mm A': return `${hours12}:${mins} ${ampm}`;
        case 'Do MMMM, YYYY': return `${ordinal(d.getDate())} ${MONTHS[d.getMonth()]}, ${year}`;
        case 'Do MMMM, YYYY [at] h:mm A': return `${ordinal(d.getDate())} ${MONTHS[d.getMonth()]}, ${year} at ${hours12}:${mins} ${ampm}`;
        default: return `${day}/${month}/${year}`;
      }
    });

    Handlebars.registerHelper('currency', function (value: unknown, symbol?: string) {
      const num = Number(value) || 0;
      const s = symbol || '₦';
      return `${s}${num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    });

    Handlebars.registerHelper('add', function (a: unknown, b: unknown) {
      return (Number(a) || 0) + (Number(b) || 0);
    });

    Handlebars.registerHelper('gt', function (a: unknown, b: unknown) {
      return (Number(a) || 0) > (Number(b) || 0);
    });
  }

  /**
   * Generate transfer request data for a single expense request
   */
  async generateSingle(companyId: number, requestId: number): Promise<TransferRequestData> {
    const request = await this.tenantPrisma.queryOne<Record<string, unknown>>(
      `SELECT er.*,
         er."requesterName" as "requesterName"
       FROM expense_requests er
       WHERE er.id = $1 AND er."companyId" = $2 AND er."deletedAt" IS NULL`,
      [requestId, companyId],
    );
    if (!request) throw new NotFoundException(`Expense request #${requestId} not found`);

    const company = await this.getCompanyDetails(companyId);
    const approver = await this.getManagementApprover(requestId);

    const amount = Number(request.totalAmount ?? 0);
    const whtAmount = Number(request.whtAmount ?? 0);
    const netAmount = amount - whtAmount;

    const beneficiary: BeneficiaryRow = {
      name: (request.beneficiaryName as string) || (request.requesterName as string) || 'N/A',
      bank: (request.beneficiaryBankName as string) || 'N/A',
      accountNumber: (request.beneficiaryAccountNumber as string) || 'N/A',
      amount: netAmount,
      description: (request.description as string) || (request.subject as string) || `Expense Request ${request.requestNumber}`,
    };

    return {
      company,
      requestDate: new Date().toISOString(),
      bankName: '',
      sourceAccountNumber: '',
      currencySymbol: (request.currency as string) || '₦',
      totalAmount: netAmount,
      totalAmountInWords: numberToNairaWords(netAmount),
      beneficiaries: [beneficiary],
      signatory: approver.name,
      signatorySignature: approver.signaturePath ? this.resolveFileDataUri(approver.signaturePath) : undefined,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate transfer request data for multiple expense requests, grouped by source bank account
   */
  async generateBatch(
    companyId: number,
    requestIds: number[],
    sourceBankAccountId: number,
  ): Promise<TransferRequestData> {
    if (!requestIds.length) throw new BadRequestException('No requests selected');

    // Verify none are already paid (double-payment prevention)
    const paidCheck = await this.tenantPrisma.query<{ id: number; requestNumber: string }>(
      `SELECT id, "requestNumber" FROM expense_requests
       WHERE id = ANY($1::int[]) AND "companyId" = $2 AND status = 'paid' AND "deletedAt" IS NULL`,
      [requestIds, companyId],
    );
    if (paidCheck.length > 0) {
      const nums = paidCheck.map(r => r.requestNumber).join(', ');
      throw new BadRequestException(`Cannot generate transfer request: ${nums} already paid. Remove paid requests from selection.`);
    }

    // Get source bank details
    const sourceBank = await this.tenantPrisma.queryOne<Record<string, unknown>>(
      `SELECT * FROM banks WHERE id = $1 AND "companyId" = $2`,
      [sourceBankAccountId, companyId],
    );
    if (!sourceBank) throw new NotFoundException('Source bank account not found');

    // Get all expense requests
    const requests = await this.tenantPrisma.query<Record<string, unknown>>(
      `SELECT er.*,
         er."requesterName" as "requesterName"
       FROM expense_requests er
       WHERE er.id = ANY($1::int[]) AND er."companyId" = $2 AND er."deletedAt" IS NULL
       ORDER BY er.id`,
      [requestIds, companyId],
    );

    if (requests.length !== requestIds.length) {
      throw new BadRequestException('Some expense requests were not found');
    }

    const company = await this.getCompanyDetails(companyId);

    const beneficiaries: BeneficiaryRow[] = requests.map(r => {
      const amount = Number(r.totalAmount ?? 0);
      const wht = Number(r.whtAmount ?? 0);
      return {
        name: (r.beneficiaryName as string) || (r.requesterName as string) || 'N/A',
        bank: (r.beneficiaryBankName as string) || 'N/A',
        accountNumber: (r.beneficiaryAccountNumber as string) || 'N/A',
        amount: amount - wht,
        description: (r.description as string) || (r.subject as string) || `${r.requestNumber}`,
      };
    });

    const totalAmount = beneficiaries.reduce((sum, b) => sum + b.amount, 0);

    // Get management approver from the first request
    const approver = await this.getManagementApprover(requestIds[0]);

    return {
      company,
      requestDate: new Date().toISOString(),
      bankName: (sourceBank.bankName as string) || '',
      bankBranch: (sourceBank.branchName as string) || '',
      bankCity: (sourceBank.city as string) || '',
      sourceAccountNumber: (sourceBank.accountNumber as string) || '',
      currencySymbol: '₦',
      totalAmount,
      totalAmountInWords: numberToNairaWords(totalAmount),
      beneficiaries,
      signatory: approver.name,
      signatorySignature: approver.signaturePath ? this.resolveFileDataUri(approver.signaturePath) : undefined,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Fetch source bank details for filling into a transfer request.
   * Use for single-request reprints to avoid the batch paid-check.
   */
  async getSourceBankDetails(
    companyId: number,
    sourceBankAccountId: number,
  ): Promise<{ bankName: string; bankBranch: string; bankCity: string; sourceAccountNumber: string }> {
    const sourceBank = await this.tenantPrisma.queryOne<Record<string, unknown>>(
      `SELECT * FROM banks WHERE id = $1 AND "companyId" = $2`,
      [sourceBankAccountId, companyId],
    );
    if (!sourceBank) throw new NotFoundException('Source bank account not found');
    return {
      bankName: (sourceBank.bankName as string) || '',
      bankBranch: (sourceBank.branchName as string) || '',
      bankCity: (sourceBank.city as string) || '',
      sourceAccountNumber: (sourceBank.accountNumber as string) || '',
    };
  }

  /**
   * Render the transfer request HTML from template
   */
  renderHtml(data: TransferRequestData): string {
    const templateStr = this.loadTemplate();
    const compiled = Handlebars.compile(templateStr);
    return compiled(data);
  }

  private loadTemplate(): string {
    if (this.templateCache) return this.templateCache;
    const templatePath = path.join(__dirname, '../../printing/templates/default-transfer-request.hbs');
    // Try multiple paths (dist vs src)
    const candidates = [
      templatePath,
      path.resolve(process.cwd(), 'src/modules/printing/templates/default-transfer-request.hbs'),
      path.resolve(process.cwd(), 'dist/src/modules/printing/templates/default-transfer-request.hbs'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        this.templateCache = fs.readFileSync(p, 'utf-8');
        return this.templateCache;
      }
    }
    throw new BadRequestException('Transfer request template not found');
  }

  private async getCompanyDetails(companyId: number) {
    const company = await this.tenantPrisma.queryOne<Record<string, unknown>>(
      `SELECT * FROM companies WHERE id = $1`,
      [companyId],
    );
    return {
      name: (company?.name as string) || '',
      logo: company?.logoPath ? this.resolveFileDataUri(company.logoPath as string) : undefined,
      address: (company?.address as string) || '',
      city: (company?.city as string) || '',
      state: (company?.state as string) || '',
      country: (company?.country as string) || 'Nigeria',
      phone: (company?.phone as string) || '',
      email: (company?.email as string) || '',
      taxNumber: (company?.taxNumber as string) || '',
    };
  }

  // ============================================================================
  // PAYMENT VOUCHER PDF
  // ============================================================================

  async generatePaymentVoucher(companyId: number, requestId: number): Promise<string> {
    const request = await this.tenantPrisma.queryOne<Record<string, unknown>>(
      `SELECT er.*,
              er."requesterName" as "requesterName",
              d.name as "departmentName",
              b."bankName" as "paidFromBank", b."accountNumber" as "paidFromAccount",
              je."entryNumber" as "journalEntryNumber"
       FROM expense_requests er
       LEFT JOIN departments d ON d.id = er."departmentId"
       LEFT JOIN banks b ON b.id = er."bankAccountId"
       LEFT JOIN journal_entries je ON je.id = er."journalEntryId"
       WHERE er.id = $1 AND er."companyId" = $2 AND er."deletedAt" IS NULL`,
      [requestId, companyId],
    );
    if (!request) throw new NotFoundException(`Expense request #${requestId} not found`);

    const company = await this.getCompanyDetails(companyId);

    // Get line items with GL codes
    const lines = await this.tenantPrisma.query<Record<string, unknown>>(
      `SELECT erl.*, a.code as "accountCode", a.name as "accountName"
       FROM expense_request_lines erl
       LEFT JOIN ifrs_accounts a ON a.id = erl."accountId"
       WHERE erl."expenseRequestId" = $1
       ORDER BY erl.id`,
      [requestId],
    );

    const grossTotal = lines.reduce((sum, l) => sum + Number(l.amount ?? 0), 0);
    const whtTotal = lines.reduce((sum, l) => sum + Number(l.whtAmount ?? 0), 0);
    const netPayable = grossTotal - whtTotal;
    const hasWht = whtTotal > 0;

    const lineData = lines.map(l => ({
      description: l.description,
      accountCode: l.accountCode || '—',
      amount: Number(l.amount ?? 0),
      whtAmount: Number(l.whtAmount ?? 0),
      netAmount: Number(l.amount ?? 0) - Number(l.whtAmount ?? 0),
    }));

    // Get approval trail with digital signatures
    const approvals = await this.tenantPrisma.query<Record<string, unknown>>(
      `SELECT pa."approverName", pa."approvedAt", pa."approvalAction",
              pafs.name as "stepName",
              COALESCE(pa."signaturePath", u."signaturePath") as "signaturePath"
       FROM process_approvals pa
       JOIN process_approval_flow_steps pafs ON pafs.id = pa."processApprovalFlowStepId"
       LEFT JOIN users u ON u.id = pa."userId"
       WHERE pa."approvableType" = 'expense_requests' AND pa."approvableId" = $1
       ORDER BY pafs."stepOrder"`,
      [requestId],
    );

    const data = {
      company,
      paymentVoucherNumber: request.paymentVoucherNumber || '—',
      transferMemoNumber: request.transferMemoNumber || '—',
      journalEntryNumber: (request as Record<string, unknown>).journalEntryNumber || '—',
      requestNumber: request.requestNumber,
      paymentDate: request.paymentDate || request.paidAt || new Date().toISOString(),
      requesterName: request.requesterName,
      departmentName: request.departmentName || '',
      description: request.description,
      subject: request.subject || '',
      beneficiaryName: request.beneficiaryName || '',
      beneficiaryBankName: request.beneficiaryBankName || '',
      beneficiaryAccountNumber: request.beneficiaryAccountNumber || '',
      currencySymbol: (request.currency as string) || '₦',
      lines: lineData,
      grossTotal,
      whtTotal,
      netPayable,
      hasWht,
      netPayableInWords: numberToNairaWords(netPayable),
      bankName: request.paidFromBank || '',
      bankAccountNumber: request.paidFromAccount || '',
      paymentReference: request.paymentReference || '',
      approvals: approvals.map(a => ({
        stepName: a.stepName,
        approverName: a.approverName || '—',
        approvedAt: a.approvedAt,
        action: a.approvalAction,
        signature: a.signaturePath ? this.resolveFileDataUri(a.signaturePath as string) : undefined,
      })),
      generatedAt: new Date().toISOString(),
    };

    return this.renderTemplate('default-payment-voucher.hbs', data);
  }

  // ============================================================================
  // EXPENSE MEMO PDF
  // ============================================================================

  async generateExpenseMemo(companyId: number, requestId: number): Promise<string> {
    const request = await this.tenantPrisma.queryOne<Record<string, unknown>>(
      `SELECT er.*,
         er."requesterName" as "requesterName"
       FROM expense_requests er
       WHERE er.id = $1 AND er."companyId" = $2 AND er."deletedAt" IS NULL`,
      [requestId, companyId],
    );
    if (!request) throw new NotFoundException(`Expense request #${requestId} not found`);

    const company = await this.getCompanyDetails(companyId);

    const lines = await this.tenantPrisma.query<Record<string, unknown>>(
      `SELECT erl.* FROM expense_request_lines erl
       WHERE erl."expenseRequestId" = $1 ORDER BY erl.id`,
      [requestId],
    );

    const grossTotal = lines.reduce((sum, l) => sum + Number(l.amount ?? 0), 0);
    const whtTotal = lines.reduce((sum, l) => sum + Number(l.whtAmount ?? 0), 0);
    const netPayable = grossTotal - whtTotal;

    // Approval trail with signatures
    const approvals = await this.tenantPrisma.query<Record<string, unknown>>(
      `SELECT pa."approverName", pa."approvedAt", pa."approvalAction",
              pafs.name as "stepName",
              COALESCE(pa."signaturePath", u."signaturePath") as "signaturePath"
       FROM process_approvals pa
       JOIN process_approval_flow_steps pafs ON pafs.id = pa."processApprovalFlowStepId"
       LEFT JOIN users u ON u.id = pa."userId"
       WHERE pa."approvableType" = 'expense_requests' AND pa."approvableId" = $1
       ORDER BY pafs."stepOrder"`,
      [requestId],
    );

    const data = {
      company,
      requestNumber: request.requestNumber,
      requestDate: request.requestDate || request.createdAt,
      requesterName: request.requesterName,
      memoTo: (request.memoTo as string) || 'Management',
      memoFrom: (request.memoFrom as string) || (request.requesterName as string) || '',
      subject: (request.subject as string) || (request.description as string) || '',
      background: request.background || '',
      description: request.description || '',
      justification: request.justification || '',
      prayer: request.prayer || '',
      beneficiaryName: request.beneficiaryName || '',
      beneficiaryBankName: request.beneficiaryBankName || '',
      beneficiaryAccountNumber: request.beneficiaryAccountNumber || '',
      currencySymbol: (request.currency as string) || '₦',
      lines: lines.map(l => ({
        description: l.description,
        amount: Number(l.amount ?? 0),
      })),
      grossTotal,
      whtTotal,
      netPayable,
      hasWht: whtTotal > 0,
      netPayableInWords: numberToNairaWords(netPayable),
      approvals: approvals.map(a => ({
        stepName: a.stepName,
        approverName: a.approverName || '—',
        approvedAt: a.approvedAt,
        action: a.approvalAction,
        signature: a.signaturePath ? this.resolveFileDataUri(a.signaturePath as string) : undefined,
      })),
      generatedAt: new Date().toISOString(),
    };

    return this.renderTemplate('default-expense-memo.hbs', data);
  }

  private renderTemplate(templateFile: string, data: Record<string, unknown>): string {
    const candidates = [
      path.join(__dirname, '../../printing/templates/', templateFile),
      path.resolve(process.cwd(), 'src/modules/printing/templates/', templateFile),
      path.resolve(process.cwd(), 'dist/src/modules/printing/templates/', templateFile),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const tmpl = fs.readFileSync(p, 'utf-8');
        return Handlebars.compile(tmpl)(data);
      }
    }
    throw new BadRequestException(`Template ${templateFile} not found`);
  }

  /**
   * Read an image file and return it as a base64 data URI for embedding in HTML/PDF.
   * Works for signatures, logos, and any other uploaded image.
   */
  private resolveFileDataUri(filePath: string): string | undefined {
    try {
      const candidates = [
        path.resolve(process.cwd(), 'uploads', filePath),
        path.resolve(process.cwd(), filePath),
        filePath,
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const buf = fs.readFileSync(p);
          const ext = path.extname(p).toLowerCase().replace('.', '');
          const mimeMap: Record<string, string> = {
            png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
            gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
          };
          const mime = mimeMap[ext] || 'image/png';
          return `data:${mime};base64,${buf.toString('base64')}`;
        }
      }
      this.logger.warn(`File not found: ${filePath}`);
      return undefined;
    } catch (err) {
      this.logger.warn(`Failed to read file: ${err}`);
      return undefined;
    }
  }

  private async getManagementApprover(requestId: number): Promise<{ name: string; signaturePath: string | null }> {
    // Find the management approval step approver with their signature
    const approver = await this.tenantPrisma.queryOne<{ approverName: string; signaturePath: string | null }>(
      `SELECT pa."approverName",
              COALESCE(pa."signaturePath", u."signaturePath") AS "signaturePath"
       FROM process_approvals pa
       LEFT JOIN users u ON u.id = pa."userId"
       JOIN process_approval_flow_steps pafs ON pafs.id = pa."processApprovalFlowStepId"
       WHERE pa."approvableType" = 'expense_requests' AND pa."approvableId" = $1
         AND pa."approvalAction" LIKE 'Approved%'
         AND (LOWER(pafs.name) LIKE '%management%' OR LOWER(pafs.name) LIKE '%general manager%' OR LOWER(pafs.name) LIKE '%director%')
       ORDER BY pafs."stepOrder" DESC LIMIT 1`,
      [requestId],
    );
    return {
      name: approver?.approverName || 'Authorize Signatory',
      signaturePath: approver?.signaturePath || null,
    };
  }
}
