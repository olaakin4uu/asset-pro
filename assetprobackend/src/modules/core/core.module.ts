import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../../common/common.module';
import { AuthModule } from '../auth/auth.module';

// Services
import {
  UsersService,
  CompaniesService,
  BranchesService,
  RolesService,
  DashboardService,
  AuditLogsService,
  ProcessApprovalFlowService,
  ProcessApprovalService,
  UserSettingsService,
  MessagesService,
  NotificationsService,
} from './services';

// Controllers
import {
  UsersController,
  CompaniesController,
  BranchesController,
  RolesController,
  DashboardController,
  AuditLogsController,
  ProcessApprovalFlowsController,
  ProcessApprovalsController,
  UserSettingsController,
  MessagesController,
  NotificationsController,
  ApprovableEntitiesController,
  SuperAdminOverrideController,
} from './controllers';
import { CompanyContextController } from './controllers/company-context.controller';
import { BackupsController } from './controllers/backups.controller';
import { TenantBackupsService } from './services/backups.service';

@Module({
  imports: [CommonModule, AuthModule, ConfigModule],
  controllers: [
    UsersController,
    CompaniesController,
    BranchesController,
    RolesController,
    CompanyContextController,
    DashboardController,
    AuditLogsController,
    ProcessApprovalFlowsController,
    ProcessApprovalsController,
    UserSettingsController,
    MessagesController,
    NotificationsController,
    ApprovableEntitiesController,
    SuperAdminOverrideController,
    BackupsController,
  ],
  providers: [
    UsersService,
    CompaniesService,
    BranchesService,
    RolesService,
    DashboardService,
    AuditLogsService,
    ProcessApprovalFlowService,
    ProcessApprovalService,
    UserSettingsService,
    MessagesService,
    NotificationsService,
    TenantBackupsService,
  ],
  exports: [
    UsersService,
    CompaniesService,
    BranchesService,
    RolesService,
    DashboardService,
    AuditLogsService,
    ProcessApprovalFlowService,
    ProcessApprovalService,
    UserSettingsService,
    MessagesService,
    NotificationsService,
  ],
})
export class CoreModule {}
