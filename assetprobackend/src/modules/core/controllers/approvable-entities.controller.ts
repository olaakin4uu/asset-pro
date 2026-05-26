import {
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { FeatureGuard } from '../../../common/guards/feature.guard';
import { TenantOnly } from '../../../common/decorators/tenant.decorators';
import { RequireModule } from '../../../common/decorators/feature.decorators';

const APPROVABLE_ENTITIES = [
  {
    entityType: 'supplier_payments',
    entitySlug: 'payables.payments',
    moduleName: 'Payables',
    displayName: 'Supplier Payment',
    pluralName: 'Supplier Payments',
  },
  {
    entityType: 'purchase_orders',
    entitySlug: 'purchase.orders',
    moduleName: 'Purchase',
    displayName: 'Purchase Order',
    pluralName: 'Purchase Orders',
  },
  {
    entityType: 'purchase_requisitions',
    entitySlug: 'purchase.requisitions',
    moduleName: 'Purchase',
    displayName: 'Purchase Requisition',
    pluralName: 'Purchase Requisitions',
  },
  {
    entityType: 'expense_requests',
    entitySlug: 'accounts.expense-requests',
    moduleName: 'Accounts',
    displayName: 'Expense Request',
    pluralName: 'Expense Requests',
  },
  {
    entityType: 'sales_orders',
    entitySlug: 'sales.orders',
    moduleName: 'Sales',
    displayName: 'Sales Order',
    pluralName: 'Sales Orders',
  },
  {
    entityType: 'sales_invoices',
    entitySlug: 'sales.invoices',
    moduleName: 'Sales',
    displayName: 'Sales Invoice',
    pluralName: 'Sales Invoices',
  },
  {
    entityType: 'journal_entries',
    entitySlug: 'accounts.journal-entries',
    moduleName: 'Accounts',
    displayName: 'Journal Entry',
    pluralName: 'Journal Entries',
  },
  {
    entityType: 'bank_transfers',
    entitySlug: 'accounts.bank-transfers',
    moduleName: 'Accounts',
    displayName: 'Bank Transfer',
    pluralName: 'Bank Transfers',
  },
  {
    entityType: 'inventory_transfers',
    entitySlug: 'inventory.transfers',
    moduleName: 'Inventory',
    displayName: 'Inventory Transfer',
    pluralName: 'Inventory Transfers',
  },
  {
    entityType: 'inventory_adjustments',
    entitySlug: 'inventory.adjustments',
    moduleName: 'Inventory',
    displayName: 'Inventory Adjustment',
    pluralName: 'Inventory Adjustments',
  },
  {
    entityType: 'internal_stock_requests',
    entitySlug: 'inventory.stock-requests',
    moduleName: 'Inventory',
    displayName: 'Internal Stock Request',
    pluralName: 'Internal Stock Requests',
  },
  {
    entityType: 'leave_requests',
    entitySlug: 'hrpayroll.leave-requests',
    moduleName: 'HR & Payroll',
    displayName: 'Leave Request',
    pluralName: 'Leave Requests',
  },
  {
    entityType: 'payroll_runs',
    entitySlug: 'hrpayroll.payroll-runs',
    moduleName: 'HR & Payroll',
    displayName: 'Payroll Run',
    pluralName: 'Payroll Runs',
  },
  {
    entityType: 'backup_restores',
    entitySlug: 'core.backups',
    moduleName: 'Core',
    displayName: 'Backup Restore',
    pluralName: 'Backup Restores',
  },
];

@ApiTags('Core - Approvable Entities')
@ApiBearerAuth()
@Controller('core/approvable-entities')
@UseGuards(JwtAuthGuard, TenantGuard, FeatureGuard)
@TenantOnly()
@RequireModule('core')
export class ApprovableEntitiesController {
  @Get()
  @ApiOperation({ summary: 'Get all entity types that support approval workflows' })
  @ApiResponse({ status: 200, description: 'List of approvable entity types' })
  async getApprovableEntities() {
    return APPROVABLE_ENTITIES.map((entity) => ({
      ...entity,
      hasActiveFlow: false,
      flowCount: 0,
    }));
  }

  @Post('scan')
  @ApiOperation({ summary: 'Scan and register approvable entity types' })
  @ApiResponse({ status: 200, description: 'Scanned approvable entity types' })
  async scanApprovableEntities() {
    const entities = APPROVABLE_ENTITIES.map((entity) => ({
      ...entity,
      hasActiveFlow: false,
      flowCount: 0,
    }));
    return { discovered: entities.length, registered: entities };
  }
}
