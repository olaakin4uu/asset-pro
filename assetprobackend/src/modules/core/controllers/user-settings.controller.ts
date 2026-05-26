import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { TenantOnly, CurrentTenant } from '../../../common/decorators/tenant.decorators';
import type { TenantContext } from '../../../common/decorators/tenant.decorators';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../../auth/decorators/current-user.decorator';
import { FileStorageService } from '../../../common/services/file-storage.service';
import { UserSettingsService } from '../services/user-settings.service';
import {
  UpdateProfileDto,
  SettingsChangePasswordDto,
  Confirm2faDto,
  Disable2faDto,
  UpdateAppearanceDto,
  SettingsProfileResponseDto,
  TwoFactorSetupResponseDto,
  TwoFactorStatusDto,
} from '../dto/user-settings.dto';

@ApiTags('Core - User Settings')
@ApiBearerAuth()
@Controller('core/settings')
@UseGuards(JwtAuthGuard, TenantGuard)
@TenantOnly()
export class UserSettingsController {
  constructor(
    private readonly settingsService: UserSettingsService,
    private readonly fileStorage: FileStorageService,
  ) {}

  // ============================================================================
  // PROFILE
  // ============================================================================

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile settings' })
  @ApiResponse({ status: 200, description: 'Profile data', type: SettingsProfileResponseDto })
  async getProfile(@CurrentUser() user: CurrentUserData): Promise<SettingsProfileResponseDto> {
    return this.settingsService.getProfile(user.id as number);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update profile (name, email)' })
  @ApiResponse({ status: 200, description: 'Profile updated', type: SettingsProfileResponseDto })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async updateProfile(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateProfileDto,
  ): Promise<SettingsProfileResponseDto> {
    return this.settingsService.updateProfile(user.id as number, dto);
  }

  // ============================================================================
  // PASSWORD
  // ============================================================================

  @Post('password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @ApiResponse({ status: 400, description: 'Current password incorrect or passwords dont match' })
  async changePassword(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: SettingsChangePasswordDto,
  ) {
    return this.settingsService.changePassword(user.id as number, dto);
  }

  // ============================================================================
  // SIGNATURE
  // ============================================================================

  @Post('signature')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('signature'))
  @ApiOperation({ summary: 'Upload digital signature' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        signature: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Signature uploaded' })
  async uploadSignature(
    @CurrentUser() user: CurrentUserData,
    @CurrentTenant() tenant: TenantContext,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      return { message: 'No file provided' };
    }

    // Store the signature file
    const result = await this.fileStorage.store(
      {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        buffer: file.buffer,
        size: file.size,
      },
      {
        destination: 'signatures',
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml'],
        maxSizeBytes: 2 * 1024 * 1024, // 2MB
        tenantSlug: tenant.tenantSlug,
      },
    );

    return this.settingsService.uploadSignature(user.id as number, result.path);
  }

  @Delete('signature')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove digital signature' })
  @ApiResponse({ status: 200, description: 'Signature removed' })
  async removeSignature(@CurrentUser() user: CurrentUserData) {
    return this.settingsService.removeSignature(user.id as number);
  }

  // ============================================================================
  // TWO-FACTOR AUTHENTICATION
  // ============================================================================

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initialize 2FA setup (generates secret and QR code URI)' })
  @ApiResponse({ status: 200, description: '2FA setup data', type: TwoFactorSetupResponseDto })
  @ApiResponse({ status: 400, description: '2FA already enabled' })
  async enable2fa(@CurrentUser() user: CurrentUserData): Promise<TwoFactorSetupResponseDto> {
    return this.settingsService.enable2fa(user.id as number);
  }

  @Post('2fa/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm 2FA with a TOTP code from authenticator app' })
  @ApiResponse({ status: 200, description: '2FA confirmed and enabled' })
  @ApiResponse({ status: 400, description: 'Invalid code or 2FA not initialized' })
  async confirm2fa(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: Confirm2faDto,
  ) {
    return this.settingsService.confirm2fa(user.id as number, dto);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA (requires password confirmation)' })
  @ApiResponse({ status: 200, description: '2FA disabled' })
  @ApiResponse({ status: 400, description: 'Password incorrect or 2FA not enabled' })
  async disable2fa(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: Disable2faDto,
  ) {
    return this.settingsService.disable2fa(user.id as number, dto);
  }

  @Get('2fa/recovery-codes')
  @ApiOperation({ summary: 'Get 2FA recovery codes' })
  @ApiResponse({ status: 200, description: 'Recovery codes' })
  @ApiResponse({ status: 400, description: '2FA not enabled' })
  async getRecoveryCodes(@CurrentUser() user: CurrentUserData) {
    return this.settingsService.getRecoveryCodes(user.id as number);
  }

  @Post('2fa/recovery-codes/regenerate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate 2FA recovery codes' })
  @ApiResponse({ status: 200, description: 'New recovery codes generated' })
  @ApiResponse({ status: 400, description: '2FA not enabled' })
  async regenerateRecoveryCodes(@CurrentUser() user: CurrentUserData) {
    return this.settingsService.regenerateRecoveryCodes(user.id as number);
  }

  // ============================================================================
  // APPEARANCE
  // ============================================================================

  @Patch('appearance')
  @ApiOperation({ summary: 'Update theme preference' })
  @ApiResponse({ status: 200, description: 'Theme updated' })
  async updateAppearance(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateAppearanceDto,
  ) {
    return this.settingsService.updateAppearance(user.id as number, dto);
  }
}
