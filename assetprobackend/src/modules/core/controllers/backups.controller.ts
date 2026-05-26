import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import type { Response } from 'express';
import * as fs from 'fs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { TenantOnly } from '../../../common/decorators/tenant.decorators';
import { TenantBackupsService } from '../services/backups.service';

@ApiTags('Core - Backups')
@Controller('core/backups')
@UseGuards(JwtAuthGuard, TenantGuard)
@TenantOnly()
@ApiBearerAuth()
export class BackupsController {
  constructor(private readonly backupsService: TenantBackupsService) {}

  @Get()
  @ApiOperation({ summary: 'List backups for current tenant' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of backups' })
  async listBackups(
    @Request() req: any,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    this.requireBackupAccess(req);
    const tenantId = req.user.tenantId;
    return this.backupsService.listBackups({
      tenantId,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create backup for current tenant' })
  @ApiResponse({ status: 201, description: 'Backup created' })
  async createBackup(
    @Request() req: any,
    @Body() body: { notes?: string },
  ) {
    this.requireBackupAccess(req);
    const tenantId = req.user.tenantId;
    const createdBy = req.user.email;
    return this.backupsService.createBackup(tenantId, createdBy, false, body.notes);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload an external backup file (.dump)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'External backup uploaded' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 500 * 1024 * 1024 } }))
  async uploadBackup(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { notes?: string },
  ) {
    this.requireBackupAccess(req);
    if (!file) {
      throw new ForbiddenException('No file provided. Please upload a .dump file.');
    }
    const tenantId = req.user.tenantId;
    const createdBy = req.user.email;
    return this.backupsService.uploadExternalBackup(tenantId, createdBy, file, body.notes);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get backup details' })
  @ApiResponse({ status: 200, description: 'Backup details' })
  async getBackup(@Request() req: any, @Param('id') id: string) {
    this.requireBackupAccess(req);
    const backup = await this.backupsService.getBackup(Number(id));
    this.requireOwnership(req, backup.tenantId);
    return backup;
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download backup file' })
  @ApiResponse({ status: 200, description: 'Backup file stream' })
  async downloadBackup(
    @Request() req: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    this.requireBackupAccess(req);
    const backup = await this.backupsService.getBackup(Number(id));
    this.requireOwnership(req, backup.tenantId);

    const { filepath, filename, cleanup } = await this.backupsService.getBackupFilePath(Number(id));
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    const stream = fs.createReadStream(filepath);
    stream.pipe(res);
    // Clean up decrypted temp file after download completes
    if (cleanup) {
      stream.on('end', cleanup);
      stream.on('error', cleanup);
    }
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore backup (Super Admin: immediate, others: requires approval)' })
  @ApiResponse({ status: 200, description: 'Restore executed or submitted for approval' })
  async requestRestore(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    this.requireBackupAccess(req);
    const backup = await this.backupsService.getBackup(Number(id));
    this.requireOwnership(req, backup.tenantId);

    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const companyId = req.user.companyId;

    // Super Admin bypasses approval — execute restore directly
    if (this.isSuperAdmin(req)) {
      return this.backupsService.executeRestore(Number(id), tenantId);
    }

    // Other admins go through approval flow
    return this.backupsService.requestRestore(Number(id), tenantId, userId, companyId);
  }

  @Get(':id/restore-status')
  @ApiOperation({ summary: 'Check restore approval status' })
  @ApiResponse({ status: 200, description: 'Restore status' })
  async getRestoreStatus(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    this.requireBackupAccess(req);
    const backup = await this.backupsService.getBackup(Number(id));
    this.requireOwnership(req, backup.tenantId);
    return this.backupsService.getRestoreStatus(Number(id));
  }

  @Post(':id/restore-approve')
  @ApiOperation({ summary: 'Super Admin: approve a pending restore request' })
  @ApiResponse({ status: 200, description: 'Restore approved and executed' })
  async approveRestore(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    this.requireBackupAccess(req);
    const backup = await this.backupsService.getBackup(Number(id));
    this.requireOwnership(req, backup.tenantId);
    return this.backupsService.approveRestoreStep(Number(id), req.user.id);
  }

  @Post(':id/restore-override')
  @ApiOperation({ summary: 'Super Admin: override all approval steps and execute restore immediately' })
  @ApiResponse({ status: 200, description: 'Restore override executed' })
  async overrideRestore(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    this.requireBackupAccess(req);
    const backup = await this.backupsService.getBackup(Number(id));
    this.requireOwnership(req, backup.tenantId);
    return this.backupsService.overrideRestore(Number(id), req.user.id, body.reason);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a backup' })
  @ApiResponse({ status: 200, description: 'Backup deleted' })
  async deleteBackup(@Request() req: any, @Param('id') id: string) {
    this.requireBackupAccess(req);
    const backup = await this.backupsService.getBackup(Number(id));
    this.requireOwnership(req, backup.tenantId);
    await this.backupsService.deleteBackup(Number(id));
    return { message: 'Backup deleted' };
  }

  private isSuperAdmin(req: any): boolean {
    return req.user.role === 'Super Admin';
  }

  private requireBackupAccess(req: any) {
    const userType = req.user?.userType;
    const role = req.user?.role;
    // Super Admin role can always access
    if (role === 'Super Admin') return;
    // ADMIN or SYSTEM userType can access
    if (userType === 'ADMIN' || userType === 'SYSTEM') return;
    throw new ForbiddenException('Only Super Admin or admin users can manage backups');
  }

  private requireOwnership(req: any, tenantId: string) {
    if (req.user.tenantId !== tenantId) {
      throw new ForbiddenException('You can only access your own backups');
    }
  }
}
