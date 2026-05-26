import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto, PaymentMethodQueryDto } from '../dto';

export interface PaymentMethod {
  id: number;
  companyId: number;
  name: string;
  code: string;
  description: string | null;
  type: string;
  isActive: boolean;
  requiresRef: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const VALID_PAYMENT_TYPES = ['cash', 'bank_transfer', 'card', 'mobile_money', 'cheque'];

@Injectable()
export class PaymentMethodsService {
  private readonly logger = new Logger(PaymentMethodsService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  async createPaymentMethod(companyId: number, dto: CreatePaymentMethodDto): Promise<PaymentMethod> {
    // Check for duplicate code
    const existing = await this.tenantPrisma.queryOne<PaymentMethod>(
      `SELECT * FROM payment_methods WHERE "companyId" = $1 AND code = $2`,
      [companyId, dto.code.toUpperCase()],
    );

    if (existing) {
      throw new BadRequestException(`Payment method code ${dto.code} already exists`);
    }

    // Validate payment type
    if (!VALID_PAYMENT_TYPES.includes(dto.type)) {
      throw new BadRequestException(
        `Invalid payment type. Must be one of: ${VALID_PAYMENT_TYPES.join(', ')}`,
      );
    }

    return this.tenantPrisma.insert<PaymentMethod>('payment_methods', {
      companyId,
      name: dto.name,
      code: dto.code.toUpperCase(),
      description: dto.description || null,
      type: dto.type,
      isActive: dto.isActive ?? true,
      requiresRef: dto.requiresRef ?? false,
    });
  }

  async updatePaymentMethod(
    companyId: number,
    paymentMethodId: number,
    dto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethod> {
    const paymentMethod = await this.findPaymentMethodById(companyId, paymentMethodId);

    // Validate payment type if provided
    if (dto.type && !VALID_PAYMENT_TYPES.includes(dto.type)) {
      throw new BadRequestException(
        `Invalid payment type. Must be one of: ${VALID_PAYMENT_TYPES.join(', ')}`,
      );
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.requiresRef !== undefined) updateData.requiresRef = dto.requiresRef;

    if (Object.keys(updateData).length === 0) {
      return paymentMethod;
    }

    const updated = await this.tenantPrisma.update<PaymentMethod>(
      'payment_methods',
      paymentMethodId,
      updateData,
    );

    if (!updated) {
      throw new NotFoundException('Payment method not found');
    }

    return updated;
  }

  async deletePaymentMethod(companyId: number, paymentMethodId: number): Promise<void> {
    await this.findPaymentMethodById(companyId, paymentMethodId);

    // Check if payment method is used in transactions
    try {
      const hasTransactions = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM expense_requests WHERE "paymentMethodId" = $1`,
        [paymentMethodId],
      );

      if (parseInt(hasTransactions?.count || '0', 10) > 0) {
        throw new BadRequestException('Cannot delete payment method used in transactions. Deactivate it instead.');
      }
    } catch (err: any) {
      // Ignore if expense_requests table/column doesn't exist yet
      if (err instanceof BadRequestException) throw err;
      this.logger.warn(`Skipping reference check for payment method: ${err.message}`);
    }

    await this.tenantPrisma.query(`DELETE FROM payment_methods WHERE id = $1`, [paymentMethodId]);
  }

  async findPaymentMethodById(companyId: number, paymentMethodId: number): Promise<PaymentMethod> {
    const paymentMethod = await this.tenantPrisma.queryOne<PaymentMethod>(
      `SELECT * FROM payment_methods WHERE id = $1 AND "companyId" = $2`,
      [paymentMethodId, companyId],
    );

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    return paymentMethod;
  }

  async findPaymentMethodByCode(companyId: number, code: string): Promise<PaymentMethod | null> {
    return this.tenantPrisma.queryOne<PaymentMethod>(
      `SELECT * FROM payment_methods WHERE "companyId" = $1 AND code = $2`,
      [companyId, code.toUpperCase()],
    );
  }

  async findAllPaymentMethods(companyId: number, query: PaymentMethodQueryDto): Promise<{
    data: PaymentMethod[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;

    let sql = `SELECT * FROM payment_methods WHERE "companyId" = $1`;
    let countSql = `SELECT COUNT(*) as count FROM payment_methods WHERE "companyId" = $1`;
    const params: any[] = [companyId];
    let paramIndex = 2;

    if (query.isActive !== undefined) {
      sql += ` AND "isActive" = $${paramIndex}`;
      countSql += ` AND "isActive" = $${paramIndex}`;
      params.push(query.isActive);
      paramIndex++;
    }

    if (query.type) {
      sql += ` AND type = $${paramIndex}`;
      countSql += ` AND type = $${paramIndex}`;
      params.push(query.type);
      paramIndex++;
    }

    if (query.search) {
      sql += ` AND (name ILIKE $${paramIndex} OR code ILIKE $${paramIndex})`;
      countSql += ` AND (name ILIKE $${paramIndex} OR code ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const [data, countResult] = await Promise.all([
      this.tenantPrisma.query<PaymentMethod>(sql, params),
      this.tenantPrisma.queryOne<{ count: string }>(countSql, params.slice(0, -2)),
    ]);

    return {
      data,
      total: parseInt(countResult?.count || '0', 10),
      page,
      limit,
    };
  }

  async getActivePaymentMethods(companyId: number): Promise<PaymentMethod[]> {
    return this.tenantPrisma.query<PaymentMethod>(
      `SELECT * FROM payment_methods
       WHERE "companyId" = $1 AND "isActive" = true
       ORDER BY name ASC`,
      [companyId],
    );
  }

  async getPaymentMethodsByType(companyId: number, type: string): Promise<PaymentMethod[]> {
    return this.tenantPrisma.query<PaymentMethod>(
      `SELECT * FROM payment_methods
       WHERE "companyId" = $1 AND type = $2 AND "isActive" = true
       ORDER BY name ASC`,
      [companyId, type],
    );
  }
}
