import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ConsolidationService } from '../services/consolidation.service';
import {
  ConsolidationQueryDto,
  ConsolidatedBalanceSheetQueryDto,
  ConsolidatedIncomeStatementQueryDto,
  ConsolidatedBalanceSheetDto,
  ConsolidatedIncomeStatementDto,
} from '../dto/consolidation.dto';
import { FeatureGuard } from '../../../common/guards/feature.guard';
import { RequireModule } from '../../../common/decorators/feature.decorators';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

@ApiTags('Consolidation')
@ApiBearerAuth()
@Controller('accounts/consolidation')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireModule('accounts')
export class ConsolidationController {
  constructor(private readonly consolidationService: ConsolidationService) {}

  @Get('balance-sheet')
  @ApiOperation({
    summary: 'Generate consolidated balance sheet',
    description:
      'Generate a consolidated balance sheet for multiple companies with optional elimination entries',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Consolidated balance sheet generated successfully',
    type: ConsolidatedBalanceSheetDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async getConsolidatedBalanceSheet(
    @Query() query: ConsolidatedBalanceSheetQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ConsolidatedBalanceSheetDto> {
    return this.consolidationService.generateConsolidatedBalanceSheet(
      query,
      user.tenantId,
    );
  }

  @Get('income-statement')
  @ApiOperation({
    summary: 'Generate consolidated income statement',
    description:
      'Generate a consolidated income statement (P&L) for multiple companies with optional elimination entries',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Consolidated income statement generated successfully',
    type: ConsolidatedIncomeStatementDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async getConsolidatedIncomeStatement(
    @Query() query: ConsolidatedIncomeStatementQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ConsolidatedIncomeStatementDto> {
    return this.consolidationService.generateConsolidatedIncomeStatement(
      query,
      user.tenantId,
    );
  }
}
