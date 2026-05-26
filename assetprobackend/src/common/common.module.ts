import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantDatabaseService } from './services/tenant-database.service';
import { EmailService } from './services/email.service';
import { WhatsAppService } from './services/whatsapp.service';
import { TermiiService } from './services/termii.service';
import { TenantPrismaService } from './services/tenant-prisma.service';
import { AuditService } from './services/audit.service';
import { FeatureService } from './services/feature.service';
import { FileStorageService } from './services/file-storage.service';
import { CompanyContextService } from './services/company-context.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { SyncConfigService } from './services/sync-config.service';
import { SyncOutboxService } from './middleware/sync-outbox.middleware';
import { FeatureGuard } from './guards/feature.guard';
import { TenantGuard } from './guards/tenant.guard';
import { CompanyContextGuard } from './guards/company-context.guard';
import { QuotaGuard } from './guards/quota.guard';
import { LookupsController } from './controllers/lookups.controller';
import { UploadController } from './controllers/upload.controller';

@Global()
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: (() => {
          const secret = process.env.JWT_SECRET;
          if (!secret) throw new Error('JWT_SECRET environment variable is required');
          return secret;
        })(),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [LookupsController, UploadController],
  providers: [
    TenantDatabaseService,
    TenantPrismaService,
    AuditService,
    FeatureService,
    FileStorageService,
    CompanyContextService,
    TokenBlacklistService,
    SyncConfigService,
    SyncOutboxService,
    FeatureGuard,
    TenantGuard,
    CompanyContextGuard,
    QuotaGuard,
    EmailService,
    WhatsAppService,
    TermiiService,
  ],
  exports: [
    TenantDatabaseService,
    TenantPrismaService,
    AuditService,
    FeatureService,
    FileStorageService,
    CompanyContextService,
    TokenBlacklistService,
    SyncConfigService,
    SyncOutboxService,
    FeatureGuard,
    TenantGuard,
    CompanyContextGuard,
    QuotaGuard,
    EmailService,
    WhatsAppService,
    TermiiService,
  ],
})
export class CommonModule {}
