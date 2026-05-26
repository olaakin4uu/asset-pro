import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { CurrentUserData } from './decorators/current-user.decorator';
import {
  LoginDto,
  LoginResponseDto,
  RegisterTenantDto,
  RegisterResponseDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  CheckSubdomainDto,
  CheckSubdomainResponseDto,
  UserProfileDto,
} from './dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ============================================================================
  // LOGIN
  // ============================================================================
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many attempts' })
  async login(
    @Body() loginDto: LoginDto,
    @CurrentUser() user: any,
  ): Promise<LoginResponseDto> {
    return this.authService.login(user);
  }

  // ============================================================================
  // REFRESH TOKEN
  // ============================================================================
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 refreshes per minute
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @ApiResponse({ status: 429, description: 'Too many refresh attempts' })
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<LoginResponseDto> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  // ============================================================================
  // REGISTER TENANT
  // ============================================================================
  @Public()
  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 registrations per hour per IP
  @ApiOperation({ summary: 'Register a new tenant/company' })
  @ApiResponse({ status: 201, description: 'Registration initiated', type: RegisterResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 409, description: 'Subdomain or email already taken' })
  async register(@Body() dto: RegisterTenantDto): Promise<RegisterResponseDto> {
    const result = await this.authService.registerTenant(dto);
    return {
      success: true,
      message: 'Registration initiated. Please wait while we set up your account.',
      registrationId: result.registrationId,
      statusUrl: `/api/v1/auth/register/status/${result.registrationId}`,
    };
  }

  // ============================================================================
  // CHECK REGISTRATION STATUS
  // ============================================================================
  @Public()
  @Get('register/status/:id')
  @ApiOperation({ summary: 'Check tenant registration status' })
  @ApiResponse({ status: 200, description: 'Registration status' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async getRegistrationStatus(@Param('id') id: string) {
    return this.authService.getRegistrationStatus(id);
  }

  // ============================================================================
  // PORTAL CONFIG — public, used by portal login page before auth
  // ============================================================================
  @Public()
  @Get('portal-config')
  @ApiOperation({ summary: 'Get portal type for a tenant (fleet vs investor)' })
  async getPortalConfig(@Query('slug') slug: string) {
    if (!slug) return { portalType: null, tenantName: null };
    return this.authService.getPortalConfig(slug);
  }

  // ============================================================================
  // CHECK SUBDOMAIN AVAILABILITY
  // ============================================================================
  @Public()
  @Post('check-subdomain')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 checks per minute
  @ApiOperation({ summary: 'Check if subdomain is available' })
  @ApiResponse({ status: 200, description: 'Availability result', type: CheckSubdomainResponseDto })
  @ApiResponse({ status: 429, description: 'Too many attempts' })
  async checkSubdomain(@Body() dto: CheckSubdomainDto): Promise<CheckSubdomainResponseDto> {
    return this.authService.checkSubdomain(dto.subdomain);
  }

  // ============================================================================
  // FORGOT PASSWORD
  // ============================================================================
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 2, ttl: 300000 } }) // 2 requests per 5 minutes
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent if account exists' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  // ============================================================================
  // RESET PASSWORD
  // ============================================================================
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 attempts per 5 minutes
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiResponse({ status: 429, description: 'Too many attempts' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  // ============================================================================
  // CHANGE PASSWORD (Authenticated)
  // ============================================================================
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password (requires authentication)' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password incorrect' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  // ============================================================================
  // GET CURRENT USER PROFILE
  // ============================================================================
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile', type: UserProfileDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: CurrentUserData): Promise<UserProfileDto> {
    return this.authService.getProfile(user.id, user.role, user.tenantSlug);
  }

  // ============================================================================
  // ACCEPT INVITE
  // ============================================================================
  @Public()
  @Post('accept-invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an email invitation and set password' })
  @ApiResponse({ status: 200, description: 'Account activated' })
  async acceptInvite(
    @Body() body: { token: string; tenantSlug: string; password: string },
  ): Promise<{ message: string }> {
    return this.authService.acceptInvite(body.token, body.tenantSlug, body.password);
  }

  // ============================================================================
  // LOGOUT (Client-side token invalidation hint)
  // ============================================================================
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (blacklist current token)' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Req() req: any) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    return this.authService.logout(token);
  }
}
