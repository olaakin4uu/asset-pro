import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AccountsService } from '../services/accounts.service';
import {
  CreateAccountDto,
  UpdateAccountDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  AccountQueryDto,
  ImportAccountsDto,
} from '../dto';
import { FeatureGuard } from '../../../common/guards/feature.guard';
import { RequireModule } from '../../../common/decorators/feature.decorators';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

@ApiTags('Accounts')
@ApiBearerAuth()
@Controller('accounts')
@UseGuards(JwtAuthGuard, FeatureGuard, PermissionsGuard)
@RequireModule('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  // ============================================================================
  // CHART OF ACCOUNTS
  // ============================================================================

  @Post('chart')
  @RequirePermission('create accounts')
  @ApiOperation({ summary: 'Create a new account' })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  async createAccount(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAccountDto,
  ) {
    return this.accountsService.createAccount(user.companyId, dto);
  }

  // IMPORTANT: Static routes (chart/tree, chart) must come BEFORE parameterized
  // routes (chart/:id) so NestJS doesn't match "tree" as an :id parameter.

  @Get('chart/tree')
  @ApiOperation({ summary: 'Get accounts as a tree structure' })
  @ApiResponse({ status: 200, description: 'Accounts tree' })
  async getAccountTree(
    @CurrentUser() user: AuthUser,
    @Query('accountType') accountType?: string,
  ) {
    const accounts = await this.accountsService.getAccountTree(user.companyId, accountType);

    // Build tree structure
    const accountMap = new Map(accounts.map(a => [a.id, { ...a, children: [] as any[] }]));
    const tree: any[] = [];

    for (const account of accountMap.values()) {
      if (account.parentId && accountMap.has(account.parentId)) {
        accountMap.get(account.parentId)!.children.push(account);
      } else {
        tree.push(account);
      }
    }

    return tree;
  }

  @Get('chart')
  @RequirePermission('view accounts')
  @ApiOperation({ summary: 'Get all accounts with optional filters' })
  @ApiResponse({ status: 200, description: 'List of accounts' })
  async getAllAccounts(
    @CurrentUser() user: AuthUser,
    @Query() query: AccountQueryDto,
  ) {
    return this.accountsService.findAllAccounts(user.companyId, query);
  }

  @Put('chart/:id')
  @RequirePermission('edit accounts')
  @ApiOperation({ summary: 'Update an account' })
  @ApiResponse({ status: 200, description: 'Account updated successfully' })
  async updateAccount(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountsService.updateAccount(user.companyId, id, dto);
  }

  @Delete('chart/:id')
  @RequirePermission('delete accounts')
  @ApiOperation({ summary: 'Delete an account' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  async deleteAccount(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.accountsService.deleteAccount(user.companyId, id);
    return { message: 'Account deleted successfully' };
  }

  @Get('chart/:id/balance')
  @ApiOperation({ summary: 'Get account balance' })
  @ApiResponse({ status: 200, description: 'Account balance details' })
  async getAccountBalance(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.accountsService.getAccountBalance(user.companyId, id);
  }

  @Get('chart/:id')
  @RequirePermission('view accounts')
  @ApiOperation({ summary: 'Get account by ID' })
  @ApiResponse({ status: 200, description: 'Account details' })
  async getAccount(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.accountsService.findAccountById(user.companyId, id);
  }

  // ============================================================================
  // CATEGORIES
  // ============================================================================

  @Post('categories')
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  async createCategory(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.accountsService.createCategory(user.companyId, dto);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  async updateCategory(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.accountsService.updateCategory(user.companyId, id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  async deleteCategory(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.accountsService.deleteCategory(id);
    return { message: 'Category deleted successfully' };
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Category details' })
  async getCategory(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.accountsService.findCategoryById(id);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async getAllCategories(
    @CurrentUser() user: AuthUser,
    @Query('categoryType') categoryType?: string,
  ) {
    return this.accountsService.findAllCategories(categoryType);
  }

  // ============================================================================
  // IMPORT
  // ============================================================================

  @Post('chart/import')
  @UseGuards(PermissionsGuard)
  @RequirePermission('import accounts')
  @ApiOperation({ summary: 'Import accounts from structured data' })
  @ApiResponse({ status: 201, description: 'Import results with counts and errors' })
  async importAccounts(
    @CurrentUser() user: AuthUser,
    @Body() dto: ImportAccountsDto,
    @Req() req: any,
  ) {
    if (dto.importMode === 'overwrite') {
      const userPermissions: Set<string> | undefined = req._userPermissions;
      if (userPermissions && !userPermissions.has('import-overwrite accounts') && !userPermissions.has('manage all records')) {
        throw new ForbiddenException('You do not have permission to use overwrite import mode. Contact your administrator.');
      }
    }
    return this.accountsService.importAccounts(user.companyId, dto);
  }

  @Get('chart/import/template')
  @ApiOperation({ summary: 'Get import template with headers and sample data' })
  @ApiResponse({ status: 200, description: 'Import template' })
  async getImportTemplate() {
    return this.accountsService.getImportTemplate();
  }
}
