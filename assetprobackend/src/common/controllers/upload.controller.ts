import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { FileStorageService, StorageOptions } from '../services/file-storage.service';
import 'multer';

@ApiTags('Common - File Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('common')
export class UploadController {
  constructor(private readonly fileStorage: FileStorageService) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, destination: { type: 'string' } } } })
  async upload(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) return { message: 'No file provided', url: null };

    const tenantSlug = req.user?.tenantSlug || 'default';
    const destination = (req.body?.destination || 'documents') as StorageOptions['destination'];

    const result = await this.fileStorage.store(file as any, {
      destination,
      tenantSlug,
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
      ],
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
    });

    return {
      url: result.url,
      path: result.path,
      filename: result.filename,
      originalName: result.originalName,
      mimeType: result.mimeType,
      size: result.size,
    };
  }
}
