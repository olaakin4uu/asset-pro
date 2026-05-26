import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CurrentCompany } from '../../../common/decorators/company-context.decorators';
import { CompanyContextGuard } from '../../../common/guards/company-context.guard';
import { MiscReceiptService } from '../services/misc-receipt.service';
import {
  CreateMiscReceiptDto,
  UpdateMiscReceiptDto,
  MiscReceiptQueryDto,
} from '../dto/misc-receipt.dto';

@Controller('accounts/misc-receipts')
@UseGuards(JwtAuthGuard, CompanyContextGuard)
export class MiscReceiptsController {
  constructor(private readonly service: MiscReceiptService) {}

  @Get('stats')
  getStats(@CurrentCompany() company: { id: number }) {
    return this.service.getStats(company.id);
  }

  @Get()
  findAll(
    @CurrentCompany() company: { id: number },
    @Query() query: MiscReceiptQueryDto,
  ) {
    return this.service.findAll(company.id, query);
  }

  @Get(':id')
  findOne(
    @CurrentCompany() company: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findOne(company.id, id);
  }

  @Post()
  create(
    @CurrentCompany() company: { id: number },
    @CurrentUser() user: { id: number },
    @Body() dto: CreateMiscReceiptDto,
  ) {
    return this.service.create(company.id, user.id, dto);
  }

  @Put(':id')
  update(
    @CurrentCompany() company: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMiscReceiptDto,
  ) {
    return this.service.update(company.id, id, dto);
  }

  @Delete(':id')
  delete(
    @CurrentCompany() company: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.delete(company.id, id);
  }

  @Post(':id/post')
  post(
    @CurrentCompany() company: { id: number },
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.post(company.id, id, user.id);
  }
}
