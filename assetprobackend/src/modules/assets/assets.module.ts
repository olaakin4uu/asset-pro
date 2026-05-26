import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { AuthModule } from '../auth/auth.module';

// Services
import {
  AssetClassService,
  AssetService,
  DepreciationService,
  DisposalService,
  TransferService,
  MaintenanceService,
  SettingsService,
} from './services';

// Controllers
import {
  AssetClassController,
  AssetController,
  DepreciationController,
  DisposalController,
  TransferController,
  MaintenanceController,
  SettingsController,
} from './controllers';

@Module({
  imports: [CommonModule, AuthModule],
  controllers: [
    // Asset Classes
    AssetClassController,
    // Assets (main entity)
    AssetController,
    // Depreciation
    DepreciationController,
    // Disposals
    DisposalController,
    // Transfers
    TransferController,
    // Maintenance
    MaintenanceController,
    // Settings
    SettingsController,
  ],
  providers: [
    AssetClassService,
    AssetService,
    DepreciationService,
    DisposalService,
    TransferService,
    MaintenanceService,
    SettingsService,
  ],
  exports: [
    AssetClassService,
    AssetService,
    DepreciationService,
    DisposalService,
    TransferService,
    MaintenanceService,
    SettingsService,
  ],
})
export class AssetsModule {}
