import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SettingsService } from '../services';
import { UpdateAssetSettingsDto } from '../dto';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

@ApiTags('Assets - Settings')
@ApiBearerAuth()
@Controller('assets/settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get asset settings' })
  @ApiResponse({ status: 200, description: 'Asset settings' })
  async get(@CurrentUser() user: AuthUser) {
    return this.settingsService.get(user.companyId);
  }

  @Put()
  @ApiOperation({ summary: 'Update asset settings' })
  @ApiResponse({ status: 200, description: 'Asset settings updated successfully' })
  async update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateAssetSettingsDto,
  ) {
    return this.settingsService.update(user.companyId, dto);
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset asset settings to defaults' })
  @ApiResponse({ status: 200, description: 'Asset settings reset to defaults' })
  async reset(@CurrentUser() user: AuthUser) {
    return this.settingsService.reset(user.companyId);
  }
}
