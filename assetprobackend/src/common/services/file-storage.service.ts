import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface StorageResult {
  path: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface StorageOptions {
  destination:
    | 'logos'
    | 'documents'
    | 'avatars'
    | 'attachments'
    | 'signatures'
    | 'voice-notes'
    | 'fm-assets';
  allowedMimeTypes?: string[];
  maxSizeBytes?: number;
  tenantSlug?: string;
}

const DEFAULT_ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

const DEFAULT_ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  // S3 / DO Spaces provider (null = local storage)
  private readonly s3: S3Client | null;
  private readonly s3Bucket: string;
  private readonly s3PublicUrl: string;
  private readonly useS3: boolean;

  constructor(private configService: ConfigService) {
    // Local storage config
    this.uploadDir = this.configService.get('UPLOAD_DIR') || path.join(process.cwd(), 'uploads');
    const port = this.configService.get('PORT') || 4000;
    this.baseUrl = this.configService.get('UPLOAD_BASE_URL') || `http://localhost:${port}/uploads`;
    this.ensureDirectoryExists(this.uploadDir);

    // S3 / DO Spaces config (optional — only wired when STORAGE_PROVIDER=s3)
    const provider = this.configService.get<string>('STORAGE_PROVIDER') ?? 'local';
    this.useS3 = provider === 's3';

    const endpoint = this.configService.get<string>('S3_ENDPOINT');      // e.g. https://nyc3.digitaloceanspaces.com
    const region   = this.configService.get<string>('S3_REGION') ?? 'us-east-1';
    const accessKey = this.configService.get<string>('S3_ACCESS_KEY');
    const secretKey = this.configService.get<string>('S3_SECRET_KEY');
    this.s3Bucket   = this.configService.get<string>('S3_BUCKET') ?? '';
    this.s3PublicUrl = this.configService.get<string>('S3_PUBLIC_URL') ?? '';

    if (this.useS3 && endpoint && accessKey && secretKey) {
      this.s3 = new S3Client({
        endpoint,
        region,
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
        forcePathStyle: false, // DO Spaces uses virtual-hosted-style
      });
      this.logger.log(`FileStorageService: using S3 provider (endpoint=${endpoint}, bucket=${this.s3Bucket})`);
    } else {
      this.s3 = null;
      if (this.useS3) {
        this.logger.warn('STORAGE_PROVIDER=s3 but S3 credentials incomplete — falling back to local storage');
      }
    }
  }

  /**
   * Store a file — delegates to S3 or local filesystem based on STORAGE_PROVIDER
   */
  async store(file: UploadedFile, options: StorageOptions): Promise<StorageResult> {
    this.validateFile(file, options);

    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${randomUUID()}${ext}`;
    const relativePath = this.buildRelativePath(options, filename);

    if (this.s3) {
      return this.storeS3(file, relativePath, filename);
    }
    return this.storeLocal(file, options, relativePath, filename);
  }

  /**
   * Delete a file by its relative path
   */
  async delete(relativePath: string): Promise<boolean> {
    if (!relativePath) return false;

    if (this.s3) {
      try {
        await this.s3.send(new DeleteObjectCommand({ Bucket: this.s3Bucket, Key: relativePath }));
        return true;
      } catch {
        return false;
      }
    }

    const fullPath = path.join(this.uploadDir, relativePath);
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(this.uploadDir)) {
      this.logger.warn(`Attempted to delete file outside upload dir: ${relativePath}`);
      return false;
    }
    try {
      await fs.promises.unlink(fullPath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }

  /**
   * Check if a file exists
   */
  async exists(relativePath: string): Promise<boolean> {
    if (!relativePath) return false;

    if (this.s3) {
      try {
        await this.s3.send(new HeadObjectCommand({ Bucket: this.s3Bucket, Key: relativePath }));
        return true;
      } catch {
        return false;
      }
    }

    const fullPath = path.join(this.uploadDir, relativePath);
    try {
      await fs.promises.access(fullPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  // ─── S3 private helpers ───────────────────────────────────────────────────

  private async storeS3(file: UploadedFile, key: string, filename: string): Promise<StorageResult> {
    await this.s3!.send(new PutObjectCommand({
      Bucket: this.s3Bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentLength: file.size,
      ACL: 'private',
    }));
    this.logger.log(`File stored on S3: ${key} (${file.size} bytes)`);
    return {
      path: key,
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `${this.s3PublicUrl}/${key}`,
    };
  }

  private async storeLocal(
    file: UploadedFile,
    options: StorageOptions,
    relativePath: string,
    filename: string,
  ): Promise<StorageResult> {
    const destDir = this.buildDestinationPath(options);
    this.ensureDirectoryExists(destDir);
    const filePath = path.join(destDir, filename);
    await fs.promises.writeFile(filePath, file.buffer);
    this.logger.log(`File stored locally: ${relativePath} (${file.size} bytes)`);
    return {
      path: relativePath,
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `${this.baseUrl}/${relativePath}`,
    };
  }

  /**
   * Get the full filesystem path for a relative path (local storage only)
   */
  getFullPath(relativePath: string): string {
    return path.join(this.uploadDir, relativePath);
  }

  /**
   * Get the public URL for a relative path
   */
  getUrl(relativePath: string): string {
    if (!relativePath) return '';
    const clean = relativePath.replace(/\\/g, '/');
    if (this.s3) return `${this.s3PublicUrl}/${clean}`;
    return `${this.baseUrl}/${clean}`;
  }

  private buildRelativePath(options: StorageOptions, filename: string): string {
    const parts: string[] = [];
    if (options.tenantSlug) parts.push('tenants', options.tenantSlug);
    parts.push(options.destination);
    const now = new Date();
    parts.push(now.getFullYear().toString(), (now.getMonth() + 1).toString().padStart(2, '0'));
    parts.push(filename);
    return parts.join('/');
  }

  /**
   * Validate file against options
   */
  private validateFile(file: UploadedFile, options: StorageOptions): void {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided');
    }

    // Determine allowed types based on destination
    let allowedTypes = options.allowedMimeTypes;
    if (!allowedTypes) {
      switch (options.destination) {
        case 'logos':
        case 'avatars':
          allowedTypes = DEFAULT_ALLOWED_IMAGE_TYPES;
          break;
        case 'documents':
        case 'attachments':
          allowedTypes = [...DEFAULT_ALLOWED_IMAGE_TYPES, ...DEFAULT_ALLOWED_DOCUMENT_TYPES];
          break;
        default:
          allowedTypes = DEFAULT_ALLOWED_IMAGE_TYPES;
      }
    }

    // Validate mime type
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }

    // Validate size
    const maxSize = options.maxSizeBytes || DEFAULT_MAX_SIZE;
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      throw new BadRequestException(`File size exceeds maximum allowed size of ${maxSizeMB}MB`);
    }
  }

  /**
   * Build destination path based on options
   */
  private buildDestinationPath(options: StorageOptions): string {
    const parts = [this.uploadDir];

    // Add tenant subdirectory if provided
    if (options.tenantSlug) {
      parts.push('tenants', options.tenantSlug);
    }

    // Add destination subdirectory
    parts.push(options.destination);

    // Add date-based subdirectory (YYYY/MM)
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    parts.push(year, month);

    return path.join(...parts);
  }

  /**
   * Ensure directory exists, creating it if necessary
   */
  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
