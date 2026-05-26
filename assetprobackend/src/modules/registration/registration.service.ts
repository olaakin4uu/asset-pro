import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantDatabaseService } from '../../common/services/tenant-database.service';
import { EmailService } from '../../common/services/email.service';
import {
  CreateRegistrationDto,
  AvailabilityResponseDto,
  RegistrationResponseDto,
  RegistrationStatusResponseDto,
} from './dto';
import * as bcrypt from 'bcryptjs';

// Reserved subdomains that cannot be used
const RESERVED_SUBDOMAINS = [
  'www',
  'api',
  'admin',
  'app',
  'mail',
  'email',
  'ftp',
  'ssh',
  'webmail',
  'cpanel',
  'whm',
  'ns1',
  'ns2',
  'dns',
  'test',
  'staging',
  'dev',
  'development',
  'prod',
  'production',
  'beta',
  'alpha',
  'status',
  'support',
  'help',
  'docs',
  'blog',
  'static',
  'cdn',
  'assets',
  'images',
  'files',
  'media',
  'download',
  'downloads',
  'auth',
  'login',
  'logout',
  'register',
  'signup',
  'signin',
  'account',
  'accounts',
  'dashboard',
  'billing',
  'payment',
  'payments',
  'subscription',
  'subscriptions',
  'settings',
  'config',
  'configuration',
  'system',
  'root',
  'administrator',
  'superadmin',
  'master',
  'central',
  'hub',
  'portal',
  'salvage',
  'salvagepro',
  'erp',
];

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private tenantDatabaseService: TenantDatabaseService,
    private emailService: EmailService,
  ) {}

  /**
   * Check if a subdomain is available
   */
  async checkSubdomainAvailability(subdomain: string): Promise<AvailabilityResponseDto> {
    const normalizedSubdomain = subdomain.toLowerCase().trim();

    // Check reserved subdomains
    if (RESERVED_SUBDOMAINS.includes(normalizedSubdomain)) {
      return {
        available: false,
        message: 'This subdomain is reserved and cannot be used',
      };
    }

    // Check if subdomain exists in tenants
    const existingTenant = await this.prisma.tenant.findFirst({
      where: { slug: normalizedSubdomain },
    });

    if (existingTenant) {
      return {
        available: false,
        message: 'This subdomain is already taken',
      };
    }

    // Check if subdomain is being registered
    const pendingRegistration = await this.prisma.registrationState.findFirst({
      where: {
        subdomain: normalizedSubdomain,
        status: { in: ['pending', 'processing'] },
        expiresAt: { gt: new Date() },
      },
    });

    if (pendingRegistration) {
      return {
        available: false,
        message: 'This subdomain is currently being registered',
      };
    }

    return {
      available: true,
      message: 'This subdomain is available',
    };
  }

  /**
   * Check if an email is available
   */
  async checkEmailAvailability(email: string): Promise<AvailabilityResponseDto> {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email exists in tenants
    const existingTenant = await this.prisma.tenant.findFirst({
      where: { email: normalizedEmail },
    });

    if (existingTenant) {
      return {
        available: false,
        message: 'This email is already associated with an organization',
      };
    }

    // Check if email is being used in pending registration
    const pendingRegistration = await this.prisma.registrationState.findFirst({
      where: {
        adminEmail: normalizedEmail,
        status: { in: ['pending', 'processing'] },
        expiresAt: { gt: new Date() },
      },
    });

    if (pendingRegistration) {
      return {
        available: false,
        message: 'This email has a pending registration',
      };
    }

    return {
      available: true,
      message: 'This email is available',
    };
  }

  /**
   * Check if a company name is available
   */
  async checkCompanyAvailability(companyName: string): Promise<AvailabilityResponseDto> {
    const normalizedName = companyName.trim();

    // Check if company name exists in tenants (case-insensitive)
    const existingTenant = await this.prisma.tenant.findFirst({
      where: {
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
    });

    if (existingTenant) {
      return {
        available: false,
        message: 'This company name is already registered',
      };
    }

    // Check if company name is in pending registration
    const pendingRegistration = await this.prisma.registrationState.findFirst({
      where: {
        companyName: {
          equals: normalizedName,
          mode: 'insensitive',
        },
        status: { in: ['pending', 'processing'] },
        expiresAt: { gt: new Date() },
      },
    });

    if (pendingRegistration) {
      return {
        available: false,
        message: 'This company name has a pending registration',
      };
    }

    return {
      available: true,
      message: 'This company name is available',
    };
  }

  /**
   * Start the registration process
   */
  async createRegistration(dto: CreateRegistrationDto): Promise<RegistrationResponseDto> {
    // Validate passwords match
    if (dto.password !== dto.password_confirmation) {
      throw new BadRequestException({ errors: { password_confirmation: 'Passwords do not match' } });
    }

    // Validate terms accepted
    if (!dto.terms_accepted) {
      throw new BadRequestException({ errors: { terms_accepted: 'You must accept the terms and conditions' } });
    }

    // Check subdomain availability
    const subdomainCheck = await this.checkSubdomainAvailability(dto.subdomain);
    if (!subdomainCheck.available) {
      throw new BadRequestException({ errors: { subdomain: subdomainCheck.message } });
    }

    // Check email availability
    const emailCheck = await this.checkEmailAvailability(dto.admin_email);
    if (!emailCheck.available) {
      throw new BadRequestException({ errors: { admin_email: emailCheck.message } });
    }

    // Check company name availability
    const companyCheck = await this.checkCompanyAvailability(dto.company_name);
    if (!companyCheck.available) {
      throw new BadRequestException({ errors: { company_name: companyCheck.message } });
    }

    // Check if plan exists
    const plan = await this.prisma.plan.findFirst({
      where: { slug: dto.plan_slug, isActive: true },
    });

    if (!plan) {
      throw new BadRequestException({ message: 'Invalid plan selected' });
    }

    // Hash password for storage
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Create registration state
    const registration = await this.prisma.registrationState.create({
      data: {
        companyName: dto.company_name.trim(),
        subdomain: dto.subdomain.toLowerCase().trim(),
        adminEmail: dto.admin_email.toLowerCase().trim(),
        planSlug: dto.plan_slug,
        status: 'processing',
        currentStep: 0,
        totalSteps: 8,
        stepMessage: 'Initializing registration...',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        data: {
          admin_name: dto.admin_name,
          admin_phone: dto.admin_phone || null,
          password_hash: hashedPassword,
        },
      },
    });

    // Start async provisioning (in real app, this would be a job queue)
    this.provisionTenant(registration.id);

    return {
      registration_id: registration.id,
      message: 'Registration started. Your organization is being set up.',
    };
  }

  /**
   * Get registration status
   */
  async getRegistrationStatus(registrationId: string): Promise<RegistrationStatusResponseDto> {
    const registration = await this.prisma.registrationState.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    const progress = Math.round((registration.currentStep / registration.totalSteps) * 100);

    const response: RegistrationStatusResponseDto = {
      registration_id: registration.id,
      status: registration.status,
      progress,
      message: registration.stepMessage || 'Processing...',
    };

    if (registration.status === 'completed' && registration.redirectUrl) {
      response.redirect_url = registration.redirectUrl;
    }

    if (registration.status === 'failed' && registration.errorMessage) {
      response.error = registration.errorMessage;
    }

    return response;
  }

  /**
   * Full tenant provisioning process
   * Creates schema, runs migrations, seeds data, and creates admin user
   */
  private async provisionTenant(registrationId: string): Promise<void> {
    const domainSuffix = this.configService.get('DOMAIN_SUFFIX', 'salvagepro.local');

    try {
      // Get registration data
      const registration = await this.prisma.registrationState.findUnique({
        where: { id: registrationId },
      });

      if (!registration) {
        this.logger.error(`Registration not found: ${registrationId}`);
        return;
      }

      const schemaName = `tenant_${registration.subdomain}`;
      const registrationData = registration.data as {
        admin_name?: string;
        admin_phone?: string;
        password_hash?: string;
      } | null;

      // Step 1: Creating organization
      await this.updateRegistrationProgress(registrationId, 1, 'Creating organization...');
      this.logger.log(`Starting provisioning for: ${registration.subdomain}`);

      // Step 2: Create schema
      await this.updateRegistrationProgress(registrationId, 2, 'Creating database schema...');
      await this.tenantDatabaseService.createSchema(schemaName);

      // Step 3: Run migrations
      await this.updateRegistrationProgress(registrationId, 3, 'Running database migrations...');
      await this.tenantDatabaseService.runMigrations(schemaName);

      // Step 4-7: Seed tenant database with all default data
      await this.updateRegistrationProgress(registrationId, 4, 'Setting up accounting...');

      const provisioningResult = await this.tenantDatabaseService.seedAndSetupTenant(
        schemaName,
        registration.companyName,
        registration.subdomain,
        {
          name: registrationData?.admin_name || 'Admin',
          email: registration.adminEmail,
          phone: registrationData?.admin_phone,
          passwordHash: registrationData?.password_hash || '',
        },
      );

      if (!provisioningResult.success) {
        throw new Error(provisioningResult.error || 'Provisioning failed');
      }

      await this.updateRegistrationProgress(registrationId, 5, 'Configuring taxes...');
      await this.delay(200); // Small delay for UI feedback

      await this.updateRegistrationProgress(registrationId, 6, 'Setting up inventory...');
      await this.delay(200);

      await this.updateRegistrationProgress(registrationId, 7, 'Finalizing setup...');

      // Create tenant record in central database
      const tenant = await this.prisma.tenant.create({
        data: {
          name: registration.companyName,
          slug: registration.subdomain,
          email: registration.adminEmail,
          status: 'active',
          schemaName,
          provisionedAt: new Date(),
          data: {
            ...(registrationData || {}),
            companyId: provisioningResult.companyId,
            entityId: provisioningResult.entityId,
            branchId: provisioningResult.branchId,
            adminUserId: provisioningResult.userId,
          },
        },
      });

      // Create primary domain
      await this.prisma.domain.create({
        data: {
          tenantId: tenant.id,
          domain: `${registration.subdomain}.${domainSuffix}`,
          isPrimary: true,
          isCustom: false,
          sslStatus: 'active',
        },
      });

      // Create subscription
      const plan = await this.prisma.plan.findFirst({
        where: { slug: registration.planSlug },
      });

      if (plan) {
        const subscription = await this.prisma.subscription.create({
          data: {
            tenantId: tenant.id,
            planId: plan.id,
            status: 'trial',
            billingCycle: 'monthly',
            trialEndsAt: new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000),
            amount: plan.priceMonthly,
          },
        });

        // Sync modules from plan so tenant gets access to all included modules
        await this.syncModulesFromPlan(subscription.id, plan.id);
      }

      // Step 8: Complete
      await this.updateRegistrationProgress(registrationId, 8, 'Complete!');

      // Update registration as completed
      await this.prisma.registrationState.update({
        where: { id: registrationId },
        data: {
          tenantId: tenant.id,
          status: 'completed',
          completedAt: new Date(),
          redirectUrl: `http://${registration.subdomain}.${domainSuffix}/login`,
        },
      });

      this.logger.log(`Provisioning completed for: ${registration.subdomain}`);

      // Send welcome email
      const loginUrl = `https://${registration.subdomain}.${domainSuffix}/login`;
      this.emailService.sendWelcome({
        email: registration.adminEmail,
        name: (registration.data as Record<string, string>)?.admin_name || 'Admin',
        companyName: registration.companyName,
        subdomain: registration.subdomain,
        loginUrl,
      }).catch((err) => this.logger.warn(`Welcome email failed: ${err}`));
    } catch (error) {
      this.logger.error(`Provisioning failed: ${error.message}`);

      // Get current step for error reporting
      const currentRegistration = await this.prisma.registrationState.findUnique({
        where: { id: registrationId },
      });

      // Mark registration as failed
      await this.prisma.registrationState.update({
        where: { id: registrationId },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Provisioning failed',
          errorStep: currentRegistration?.currentStep || 0,
        },
      });
    }
  }

  private async updateRegistrationProgress(registrationId: string, step: number, message: string): Promise<void> {
    await this.prisma.registrationState.update({
      where: { id: registrationId },
      data: {
        currentStep: step,
        stepMessage: message,
      },
    });
  }

  private async syncModulesFromPlan(subscriptionId: number, planId: number): Promise<void> {
    try {
      const planModules = await this.prisma.planModule.findMany({
        where: { planId, isIncluded: true },
        include: {
          module: true,
          planModuleFeatures: {
            where: { isEnabled: true },
            include: { feature: true },
          },
        },
      });

      for (const pm of planModules) {
        const enabledFeatures = pm.planModuleFeatures.map((f) => f.feature.slug);

        await this.prisma.subscriptionModule.create({
          data: {
            subscriptionId,
            moduleId: pm.moduleId,
            status: 'enabled',
            enabledAt: new Date(),
            isIncluded: true,
            amount: 0,
            enabledFeatures,
          },
        });
      }

      this.logger.log(`Synced ${planModules.length} modules from plan for subscription ${subscriptionId}`);
    } catch (error) {
      this.logger.error(`Failed to sync modules from plan: ${error.message}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
