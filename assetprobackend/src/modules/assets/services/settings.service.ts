import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { UpdateAssetSettingsDto, DepreciationMethod, DepreciationFrequency } from '../dto';

// ============================================================================
// INTERFACES
// ============================================================================

export interface AssetSettings {
  id: number;
  companyId: number;

  // Depreciation Settings
  defaultDepreciationMethod: string;
  autoCalculateDepreciation: boolean;
  depreciationFrequency: string;
  prorationFirstYear: boolean;
  prorationDisposalYear: boolean;
  midMonthConvention: boolean;

  // Lifecycle Settings
  requireAssetApproval: boolean;
  requireDisposalApproval: boolean;
  requireTransferApproval: boolean;
  requireMaintenanceApproval: boolean;
  autoGenerateCode: boolean;
  codePrefix: string;
  codePadding: number;

  // Valuation Settings
  allowRevaluation: boolean;
  requireRevaluationApproval: boolean;
  trackImpairment: boolean;
  calculateFairValue: boolean;

  // Maintenance Settings
  trackMaintenanceCosts: boolean;
  maintenanceReminderDays: number;
  allowMaintenanceScheduling: boolean;
  capitalizationThreshold: number;

  // Transfer Settings
  allowInterCompanyTransfer: boolean;
  allowInterBranchTransfer: boolean;
  requirePhysicalVerification: boolean;

  // Notification Settings
  notifyOnDepreciation: boolean;
  notifyOnMaintenanceDue: boolean;
  notifyOnWarrantyExpiry: boolean;
  notifyOnDisposal: boolean;
  warrantyExpiryReminderDays: number;

  // Barcode & Tracking
  enableBarcode: boolean;
  enableQrCode: boolean;
  barcodeFormat: string | null;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

const DEFAULT_SETTINGS: Omit<AssetSettings, 'id' | 'companyId' | 'createdAt' | 'updatedAt'> = {
  defaultDepreciationMethod: DepreciationMethod.STRAIGHT_LINE,
  autoCalculateDepreciation: true,
  depreciationFrequency: DepreciationFrequency.MONTHLY,
  prorationFirstYear: true,
  prorationDisposalYear: true,
  midMonthConvention: false,

  requireAssetApproval: false,
  requireDisposalApproval: true,
  requireTransferApproval: true,
  requireMaintenanceApproval: false,
  autoGenerateCode: true,
  codePrefix: 'AST',
  codePadding: 6,

  allowRevaluation: false,
  requireRevaluationApproval: true,
  trackImpairment: true,
  calculateFairValue: false,

  trackMaintenanceCosts: true,
  maintenanceReminderDays: 7,
  allowMaintenanceScheduling: true,
  capitalizationThreshold: 5000,

  allowInterCompanyTransfer: false,
  allowInterBranchTransfer: true,
  requirePhysicalVerification: true,

  notifyOnDepreciation: false,
  notifyOnMaintenanceDue: true,
  notifyOnWarrantyExpiry: true,
  notifyOnDisposal: true,
  warrantyExpiryReminderDays: 30,

  enableBarcode: true,
  enableQrCode: false,
  barcodeFormat: null,
};

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  // ============================================================================
  // GET SETTINGS
  // ============================================================================

  async get(companyId: number): Promise<AssetSettings> {
    let settings = await this.tenantPrisma.queryOne<AssetSettings>(
      `SELECT * FROM ast_settings WHERE "companyId" = $1`,
      [companyId],
    );

    if (!settings) {
      // Create default settings
      settings = await this.createDefaultSettings(companyId);
    }

    return settings;
  }

  // ============================================================================
  // UPDATE SETTINGS
  // ============================================================================

  async update(companyId: number, dto: UpdateAssetSettingsDto): Promise<AssetSettings> {
    // Ensure settings exist
    await this.get(companyId);

    const updateData: Record<string, any> = {};

    // Depreciation Settings
    if (dto.defaultDepreciationMethod !== undefined) updateData.defaultDepreciationMethod = dto.defaultDepreciationMethod;
    if (dto.autoCalculateDepreciation !== undefined) updateData.autoCalculateDepreciation = dto.autoCalculateDepreciation;
    if (dto.depreciationFrequency !== undefined) updateData.depreciationFrequency = dto.depreciationFrequency;
    if (dto.prorationFirstYear !== undefined) updateData.prorationFirstYear = dto.prorationFirstYear;
    if (dto.prorationDisposalYear !== undefined) updateData.prorationDisposalYear = dto.prorationDisposalYear;
    if (dto.midMonthConvention !== undefined) updateData.midMonthConvention = dto.midMonthConvention;

    // Lifecycle Settings
    if (dto.requireAssetApproval !== undefined) updateData.requireAssetApproval = dto.requireAssetApproval;
    if (dto.requireDisposalApproval !== undefined) updateData.requireDisposalApproval = dto.requireDisposalApproval;
    if (dto.requireTransferApproval !== undefined) updateData.requireTransferApproval = dto.requireTransferApproval;
    if (dto.requireMaintenanceApproval !== undefined) updateData.requireMaintenanceApproval = dto.requireMaintenanceApproval;
    if (dto.autoGenerateCode !== undefined) updateData.autoGenerateCode = dto.autoGenerateCode;
    if (dto.codePrefix !== undefined) updateData.codePrefix = dto.codePrefix;
    if (dto.codePadding !== undefined) updateData.codePadding = dto.codePadding;

    // Valuation Settings
    if (dto.allowRevaluation !== undefined) updateData.allowRevaluation = dto.allowRevaluation;
    if (dto.requireRevaluationApproval !== undefined) updateData.requireRevaluationApproval = dto.requireRevaluationApproval;
    if (dto.trackImpairment !== undefined) updateData.trackImpairment = dto.trackImpairment;
    if (dto.calculateFairValue !== undefined) updateData.calculateFairValue = dto.calculateFairValue;

    // Maintenance Settings
    if (dto.trackMaintenanceCosts !== undefined) updateData.trackMaintenanceCosts = dto.trackMaintenanceCosts;
    if (dto.maintenanceReminderDays !== undefined) updateData.maintenanceReminderDays = dto.maintenanceReminderDays;
    if (dto.allowMaintenanceScheduling !== undefined) updateData.allowMaintenanceScheduling = dto.allowMaintenanceScheduling;
    if (dto.capitalizationThreshold !== undefined) updateData.capitalizationThreshold = dto.capitalizationThreshold;

    // Transfer Settings
    if (dto.allowInterCompanyTransfer !== undefined) updateData.allowInterCompanyTransfer = dto.allowInterCompanyTransfer;
    if (dto.allowInterBranchTransfer !== undefined) updateData.allowInterBranchTransfer = dto.allowInterBranchTransfer;
    if (dto.requirePhysicalVerification !== undefined) updateData.requirePhysicalVerification = dto.requirePhysicalVerification;

    // Notification Settings
    if (dto.notifyOnDepreciation !== undefined) updateData.notifyOnDepreciation = dto.notifyOnDepreciation;
    if (dto.notifyOnMaintenanceDue !== undefined) updateData.notifyOnMaintenanceDue = dto.notifyOnMaintenanceDue;
    if (dto.notifyOnWarrantyExpiry !== undefined) updateData.notifyOnWarrantyExpiry = dto.notifyOnWarrantyExpiry;
    if (dto.notifyOnDisposal !== undefined) updateData.notifyOnDisposal = dto.notifyOnDisposal;
    if (dto.warrantyExpiryReminderDays !== undefined) updateData.warrantyExpiryReminderDays = dto.warrantyExpiryReminderDays;

    // Barcode & Tracking
    if (dto.enableBarcode !== undefined) updateData.enableBarcode = dto.enableBarcode;
    if (dto.enableQrCode !== undefined) updateData.enableQrCode = dto.enableQrCode;
    if (dto.barcodeFormat !== undefined) updateData.barcodeFormat = dto.barcodeFormat;

    if (Object.keys(updateData).length > 0) {
      await this.tenantPrisma.query(
        `UPDATE ast_settings SET ${Object.keys(updateData).map((k, i) => `"${k}" = $${i + 2}`).join(', ')}, "updatedAt" = NOW() WHERE "companyId" = $1`,
        [companyId, ...Object.values(updateData)],
      );
    }

    return this.get(companyId);
  }

  // ============================================================================
  // RESET SETTINGS
  // ============================================================================

  async reset(companyId: number): Promise<AssetSettings> {
    // Delete existing settings
    await this.tenantPrisma.query(
      `DELETE FROM ast_settings WHERE "companyId" = $1`,
      [companyId],
    );

    // Create new default settings
    return this.createDefaultSettings(companyId);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async createDefaultSettings(companyId: number): Promise<AssetSettings> {
    return this.tenantPrisma.insert<AssetSettings>('ast_settings', {
      companyId,
      ...DEFAULT_SETTINGS,
    });
  }
}
