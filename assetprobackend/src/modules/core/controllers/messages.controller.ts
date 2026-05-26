import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { MessagesService } from '../services/messages.service';
import {
  CreateMessageDto,
  ReplyMessageDto,
  MessageQueryDto,
  MessageResponseDto,
  PaginatedMessagesDto,
} from '../dto';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('core/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Send a new message or save as draft' })
  @ApiResponse({ status: 201, description: 'Message sent/saved', type: MessageResponseDto })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messagesService.create(user.companyId, user.id, dto);
  }

  @Get('inbox')
  @ApiOperation({ summary: 'Get inbox messages' })
  @ApiResponse({ status: 200, description: 'Inbox messages', type: PaginatedMessagesDto })
  async getInbox(
    @CurrentUser() user: AuthUser,
    @Query() query: MessageQueryDto,
  ): Promise<PaginatedMessagesDto> {
    return this.messagesService.getInbox(user.companyId, user.id, query);
  }

  @Get('sent')
  @ApiOperation({ summary: 'Get sent messages' })
  @ApiResponse({ status: 200, description: 'Sent messages', type: PaginatedMessagesDto })
  async getSent(
    @CurrentUser() user: AuthUser,
    @Query() query: MessageQueryDto,
  ): Promise<PaginatedMessagesDto> {
    return this.messagesService.getSent(user.companyId, user.id, query);
  }

  @Get('drafts')
  @ApiOperation({ summary: 'Get draft messages' })
  @ApiResponse({ status: 200, description: 'Draft messages', type: PaginatedMessagesDto })
  async getDrafts(
    @CurrentUser() user: AuthUser,
    @Query() query: MessageQueryDto,
  ): Promise<PaginatedMessagesDto> {
    return this.messagesService.getDrafts(user.companyId, user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a message by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Message details', type: MessageResponseDto })
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MessageResponseDto> {
    return this.messagesService.findOne(user.companyId, user.id, id);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Reply to a message' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 201, description: 'Reply sent', type: MessageResponseDto })
  async reply(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplyMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messagesService.reply(user.companyId, user.id, id, dto);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a message as read' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  async markAsRead(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.messagesService.markAsRead(user.companyId, user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a message' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Message deleted' })
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.messagesService.delete(user.companyId, user.id, id);
  }
}
