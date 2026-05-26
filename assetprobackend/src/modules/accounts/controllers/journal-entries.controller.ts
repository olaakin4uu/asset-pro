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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JournalEntryService } from '../services/journal-entry.service';
import {
  CreateJournalEntryDto,
  UpdateJournalEntryDto,
  PostJournalEntryDto,
  ReverseJournalEntryDto,
  JournalEntryQueryDto,
} from '../dto';
import { FeatureGuard } from '../../../common/guards/feature.guard';
import { RequireModule, RequireFeature } from '../../../common/decorators/feature.decorators';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

@ApiTags('Journal Entries')
@ApiBearerAuth()
@Controller('accounts/journal-entries')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireModule('accounts')
export class JournalEntriesController {
  constructor(private readonly journalEntryService: JournalEntryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new journal entry' })
  @ApiResponse({ status: 201, description: 'Journal entry created successfully' })
  @RequireFeature('accounts', 'accounts.journal_entries')
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateJournalEntryDto,
  ) {
    return this.journalEntryService.create(user.companyId, dto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a journal entry' })
  @ApiResponse({ status: 200, description: 'Journal entry updated successfully' })
  @RequireFeature('accounts', 'accounts.journal_entries')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateJournalEntryDto,
  ) {
    return this.journalEntryService.update(user.companyId, id, dto, user.id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit a draft journal entry for approval' })
  @ApiResponse({ status: 200, description: 'Journal entry submitted for review' })
  @RequireFeature('accounts', 'accounts.journal_entries')
  async submit(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.journalEntryService.submit(user.companyId, id, user.id);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Level 1: Review a pending journal entry (must be different user from creator)' })
  @ApiResponse({ status: 200, description: 'Journal entry reviewed' })
  @RequireFeature('accounts', 'accounts.journal_entries')
  async review(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { comment?: string },
  ) {
    return this.journalEntryService.review(user.companyId, id, user.id, body.comment);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Level 2: Approve a reviewed journal entry (must be different user from creator and reviewer)' })
  @ApiResponse({ status: 200, description: 'Journal entry approved and posted' })
  @RequireFeature('accounts', 'accounts.journal_entries')
  async approve(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { comment?: string },
  ) {
    return this.journalEntryService.approve(user.companyId, id, user.id, body.comment);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a journal entry back to draft (requires reason)' })
  @ApiResponse({ status: 200, description: 'Journal entry rejected' })
  @RequireFeature('accounts', 'accounts.journal_entries')
  async reject(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason: string },
  ) {
    return this.journalEntryService.reject(user.companyId, id, user.id, body.reason);
  }

  @Post(':id/post')
  @ApiOperation({ summary: 'Direct post a journal entry (only for entries not requiring approval)' })
  @ApiResponse({ status: 200, description: 'Journal entry posted successfully' })
  @RequireFeature('accounts', 'accounts.journal_entries')
  async post(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PostJournalEntryDto,
  ) {
    return this.journalEntryService.post(user.companyId, id, dto, user.id);
  }

  @Post(':id/reverse')
  @ApiOperation({ summary: 'Reverse a posted journal entry' })
  @ApiResponse({ status: 200, description: 'Journal entry reversed successfully' })
  @RequireFeature('accounts', 'accounts.journal_entries')
  async reverse(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReverseJournalEntryDto,
  ) {
    return this.journalEntryService.reverse(user.companyId, id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft journal entry' })
  @ApiResponse({ status: 200, description: 'Journal entry deleted successfully' })
  @RequireFeature('accounts', 'accounts.journal_entries')
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.journalEntryService.delete(user.companyId, id);
    return { message: 'Journal entry deleted successfully' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get journal entry by ID with lines' })
  @ApiResponse({ status: 200, description: 'Journal entry details' })
  async getById(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.journalEntryService.findById(user.companyId, id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all journal entries with optional filters' })
  @ApiResponse({ status: 200, description: 'List of journal entries' })
  async getAll(
    @CurrentUser() user: AuthUser,
    @Query() query: JournalEntryQueryDto,
  ) {
    return this.journalEntryService.findAll(user.companyId, query);
  }
}
