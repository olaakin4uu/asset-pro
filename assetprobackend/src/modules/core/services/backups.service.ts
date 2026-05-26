import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProcessApprovalService } from './process-approval.service';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { isSuperAdmin } from '../../../common/utils/super-admin';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const execAsync = promisify(exec);



// AES-256-GCM encryption for backup files
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

function deriveKey(masterKey: string, tenantId: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(`${masterKey}:${tenantId}`, salt, 100000, 32, 'sha512');
}

function encryptFile(inputPath: string, outputPath: string, masterKey: string, tenantId: string): void {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(masterKey, tenantId, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  const input = fs.readFileSync(inputPath);
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // File format: [salt(32)] [iv(16)] [authTag(16)] [encrypted data]
  const output = Buffer.concat([salt, iv, authTag, encrypted]);
  fs.writeFileSync(outputPath, output);
}

function decryptFile(inputPath: string, outputPath: string, masterKey: string, tenantId: string): void {
  const data = fs.readFileSync(inputPath);

  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = deriveKey(masterKey, tenantId, salt);
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  fs.writeFileSync(outputPath, decrypted);
}

/**
 * TenantBackupsService — backup and restore for tenant admins.
 * Handles per-tenant schema backup/restore using pg_dump/pg_restore.
 * Restore operations go through the approval flow system.
 */
@Injectable()
export class TenantBackupsService {
  private readonly logger = new Logger(TenantBackupsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly approvalService: ProcessApprovalService,
    private readonly tenantPrisma: TenantPrismaService,
  ) {}

  private getPgBinaries() {
    const pgDump = this.config.get<string>('PG_DUMP_PATH') || process.env.PG_DUMP_PATH || 'pg_dump';
    const pgRestore = this.config.get<string>('PG_RESTORE_PATH') || process.env.PG_RESTORE_PATH || 'pg_restore';
    const psql = this.config.get<string>('PSQL_PATH') || process.env.PSQL_PATH || 'psql';
    this.logger.debug(`pg binaries: dump=${pgDump}, restore=${pgRestore}, psql=${psql}`);
    return {
      pgDump: `"${pgDump}"`,
      pgRestore: `"${pgRestore}"`,
      psql: `"${psql}"`,
    };
  }

  private getDbConfig() {
    const dbUrl = this.config.get<string>('DATABASE_URL') || process.env.DATABASE_URL || '';
    const url = new URL(dbUrl);
    return {
      host: url.hostname || 'localhost',
      port: url.port || '5432',
      user: decodeURIComponent(url.username || 'postgres'),
      password: decodeURIComponent(url.password || ''),
      database: url.pathname.replace('/', '') || 'salvagepro',
    };
  }

  private getBackupDir(): string {
    const dir = path.resolve(__dirname, '..', '..', '..', '..', '..', 'backups');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private getRetentionDays(): number {
    return parseInt(this.config.get<string>('BACKUP_RETENTION_DAYS', '30'), 10);
  }

  private getEncryptionKey(): string {
    const key = this.config.get<string>('BACKUP_ENCRYPTION_KEY') || process.env.BACKUP_ENCRYPTION_KEY;
    if (!key) throw new BadRequestException('BACKUP_ENCRYPTION_KEY is not configured. Set it in your .env file.');
    return key;
  }

  private async calculateChecksum(filepath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filepath);
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private serialiseBackup(record: any) {
    return {
      ...record,
      sizeBytes: record.sizeBytes ? Number(record.sizeBytes) : 0,
    };
  }

  /**
   * Create a backup record immediately (status: in_progress) and run
   * pg_dump in the background. Returns the in_progress record so the
   * HTTP response is not held open while pg_dump runs (which can take
   * several minutes on large schemas and cause Nginx timeouts).
   *
   * Callers can poll GET /core/backups/:id to check when status → completed.
   */
  async createBackup(tenantId: string, createdBy?: string, isScheduled = false, notes?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const schemaName = tenant.schemaName.replace(/[^a-z0-9_]/gi, '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${tenant.slug}_${timestamp}.dump.enc`;
    const retentionDays = this.getRetentionDays();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + retentionDays);

    // Create the record immediately — this is what we return to the caller
    const record = await this.prisma.tenantBackup.create({
      data: { tenantId, schemaName, filename, status: 'in_progress', createdBy, isScheduled, notes, expiresAt },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });

    // Run pg_dump in the background — do NOT await, return immediately
    this.runBackupInBackground(record.id, tenantId, schemaName, filename).catch(() => {/* logged inside */});

    return this.serialiseBackup(record);
  }

  private async runBackupInBackground(
    recordId: number,
    tenantId: string,
    schemaName: string,
    filename: string,
  ): Promise<void> {
    const backupDir = this.getBackupDir();
    const filepath = path.join(backupDir, filename);
    const rawFilepath = path.join(backupDir, filename.replace('.dump.enc', '.dump'));

    try {
      const db = this.getDbConfig();
      const encryptionKey = this.getEncryptionKey();
      const { pgDump } = this.getPgBinaries();
      const cmd = `${pgDump} -h ${db.host} -p ${db.port} -U ${db.user} -d ${db.database} --schema="${schemaName}" --format=custom --file="${rawFilepath}"`;
      this.logger.log(`Backup command: ${cmd}`);

      await execAsync(cmd, { env: { ...process.env, PGPASSWORD: db.password }, timeout: 600_000 });

      encryptFile(rawFilepath, filepath, encryptionKey, tenantId);
      fs.unlinkSync(rawFilepath);

      const stats = fs.statSync(filepath);
      const checksum = await this.calculateChecksum(filepath);

      await this.prisma.tenantBackup.update({
        where: { id: recordId },
        data: { sizeBytes: BigInt(stats.size), checksum, status: 'completed' },
      });

      this.logger.log(`Backup completed: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    } catch (error: any) {
      this.logger.error(`Backup failed (record ${recordId}): ${error.message}`);
      // Clean up raw dump if it exists
      if (fs.existsSync(rawFilepath)) { try { fs.unlinkSync(rawFilepath); } catch {} }
      await this.prisma.tenantBackup.update({
        where: { id: recordId },
        data: { status: 'failed', notes: `Error: ${error.message}`.slice(0, 500) },
      }).catch(() => {});
    }
  }

  async listBackups(params: { tenantId?: string; skip?: number; take?: number; status?: string }) {
    try {
      const where: Record<string, unknown> = {};
      if (params.tenantId) where.tenantId = params.tenantId;
      if (params.status) {
        where.status = params.status;
      } else {
        where.status = { not: 'deleted' };
      }

      const [data, total] = await Promise.all([
        this.prisma.tenantBackup.findMany({
          where,
          include: { tenant: { select: { id: true, name: true, slug: true } } },
          orderBy: { createdAt: 'desc' },
          skip: params.skip || 0,
          take: params.take || 20,
        }),
        this.prisma.tenantBackup.count({ where }),
      ]);

      return { data: data.map(this.serialiseBackup), total };
    } catch (error: unknown) {
      this.logger.warn(`Failed to list backups: ${error instanceof Error ? error.message : String(error)}`);
      return { data: [], total: 0 };
    }
  }

  async getBackup(id: number) {
    const backup = await this.prisma.tenantBackup.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!backup) throw new NotFoundException('Backup not found');
    return this.serialiseBackup(backup);
  }

  async getBackupFilePath(id: number): Promise<{ filepath: string; filename: string; cleanup?: () => void }> {
    const backup = await this.prisma.tenantBackup.findUnique({ where: { id } });
    if (!backup || backup.status !== 'completed') {
      throw new NotFoundException('Backup not found or not completed');
    }
    const encFilepath = path.join(this.getBackupDir(), backup.filename);
    if (!fs.existsSync(encFilepath)) {
      throw new NotFoundException('Backup file not found on disk');
    }

    // If file is encrypted (.enc), decrypt to a temp file for download
    if (backup.filename.endsWith('.enc')) {
      const encryptionKey = this.getEncryptionKey();
      const decryptedName = backup.filename.replace('.enc', '');
      const decryptedPath = path.join(this.getBackupDir(), `_dl_${Date.now()}_${decryptedName}`);
      decryptFile(encFilepath, decryptedPath, encryptionKey, backup.tenantId);
      return {
        filepath: decryptedPath,
        filename: decryptedName,
        cleanup: () => { try { fs.unlinkSync(decryptedPath); } catch {} },
      };
    }

    // Legacy unencrypted backups
    return { filepath: encFilepath, filename: backup.filename };
  }

  /**
   * Request a restore — submits to approval flow if configured,
   * otherwise returns an error asking admin to configure approval.
   */
  async requestRestore(backupId: number, targetTenantId: string, userId: number, companyId: number) {
    const backup = await this.prisma.tenantBackup.findUnique({ where: { id: backupId } });
    if (!backup || backup.status !== 'completed') {
      throw new NotFoundException('Backup not found or not completed');
    }

    const targetTenant = await this.prisma.tenant.findUnique({ where: { id: targetTenantId } });
    if (!targetTenant) throw new NotFoundException('Target tenant not found');

    const sourceFile = path.join(this.getBackupDir(), backup.filename);
    if (!fs.existsSync(sourceFile)) {
      throw new NotFoundException('Backup file not found on disk');
    }

    // Mark backup with restore request details
    await this.prisma.tenantBackup.update({
      where: { id: backupId },
      data: {
        restoreStatus: 'PENDING_APPROVAL',
        restoreTarget: targetTenantId,
        requestedById: userId,
      },
    });

    // Submit for approval
    try {
      await this.approvalService.initiateApproval(
        {
          processType: 'backup_restores',
          recordId: backupId,
          companyId,
          comment: `Restore backup "${backup.filename}" to ${targetTenant.name}`,
        },
        userId,
      );

      this.logger.log(`Restore request submitted for approval: backup ${backupId} → ${targetTenant.name}`);
      return {
        success: true,
        status: 'PENDING_APPROVAL',
        message: `Restore request submitted for approval. Another admin must approve before the restore executes.`,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // Reset restore status on failure
      await this.prisma.tenantBackup.update({
        where: { id: backupId },
        data: { restoreStatus: null, restoreTarget: null, requestedById: null },
      });

      if (message.includes('No active approval flow') || message.includes('not found')) {
        throw new BadRequestException(
          'No approval flow configured for backup restores. Please ask a Super Admin to create one under Approvals → Flows.',
        );
      }
      throw err;
    }
  }

  /**
   * Execute restore — called after approval is granted.
   * Also callable by central admin (bypasses approval).
   */
  async executeRestore(backupId: number, targetTenantId: string) {
    const backup = await this.prisma.tenantBackup.findUnique({ where: { id: backupId } });
    if (!backup || backup.status !== 'completed') {
      throw new NotFoundException('Backup not found or not completed');
    }

    const targetTenant = await this.prisma.tenant.findUnique({ where: { id: targetTenantId } });
    if (!targetTenant) throw new NotFoundException('Target tenant not found');

    const encFile = path.join(this.getBackupDir(), backup.filename);
    if (!fs.existsSync(encFile)) {
      throw new NotFoundException('Backup file not found on disk');
    }

    // Decrypt if encrypted
    let sourceFile = encFile;
    let decryptedTmp: string | null = null;
    if (backup.filename.endsWith('.enc')) {
      const encryptionKey = this.getEncryptionKey();
      decryptedTmp = path.join(this.getBackupDir(), `_restore_${Date.now()}_${backup.filename.replace('.enc', '')}`);
      decryptFile(encFile, decryptedTmp, encryptionKey, backup.tenantId);
      sourceFile = decryptedTmp;
    }

    const targetSchema = targetTenant.schemaName.replace(/[^a-z0-9_]/gi, '');

    // Auto pre-restore backup
    try {
      this.logger.log(`Creating pre-restore backup for ${targetTenant.name}`);
      await this.createBackup(targetTenantId, 'system (pre-restore)', false, `Auto backup before restore from ${backup.filename}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Pre-restore backup failed: ${msg}`);
    }

    try {
      const db = this.getDbConfig();
      const { pgRestore, psql } = this.getPgBinaries();
      const execOpts = { env: { ...process.env, PGPASSWORD: db.password }, timeout: 600_000 };
      const connArgs = `-h ${db.host} -p ${db.port} -U ${db.user} -d ${db.database}`;

      // Drop and recreate target schema
      await execAsync(`${psql} ${connArgs} -c "DROP SCHEMA IF EXISTS \\"${targetSchema}\\" CASCADE;"`, execOpts);
      await execAsync(`${psql} ${connArgs} -c "CREATE SCHEMA \\"${targetSchema}\\";"`, execOpts);

      // Restore
      const sourceSchema = backup.schemaName.replace(/[^a-z0-9_]/gi, '');
      if (sourceSchema !== targetSchema) {
        const tmpSql = path.join(this.getBackupDir(), `_restore_tmp_${Date.now()}.sql`);
        await execAsync(`${pgRestore} --no-owner --no-acl -f "${tmpSql}" "${sourceFile}"`, execOpts);
        let sql = fs.readFileSync(tmpSql, 'utf-8');
        const srcEscaped = sourceSchema.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        sql = sql.replace(new RegExp(`\\b${srcEscaped}\\.`, 'g'), `${targetSchema}.`);
        sql = sql.replace(new RegExp(`SCHEMA ${srcEscaped}`, 'g'), `SCHEMA ${targetSchema}`);
        sql = sql.replace(new RegExp(`::${srcEscaped}\\.`, 'g'), `::${targetSchema}.`);
        sql = sql.replace(new RegExp(`'${srcEscaped}\\.`, 'g'), `'${targetSchema}.`);
        fs.writeFileSync(tmpSql, sql);
        await execAsync(`${psql} ${connArgs} -f "${tmpSql}"`, execOpts);
        fs.unlinkSync(tmpSql);
      } else {
        await execAsync(`${pgRestore} ${connArgs} --no-owner --no-acl --schema="${targetSchema}" "${sourceFile}"`, execOpts);
      }

      // Update backup record
      await this.prisma.tenantBackup.update({
        where: { id: backupId },
        data: { restoredAt: new Date(), restoreStatus: 'RESTORED' },
      });

      this.logger.log(`Restore completed: ${backup.filename} → ${targetSchema}`);
      return { success: true, message: `Restored ${backup.filename} to ${targetTenant.name}` };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Restore failed: ${msg}`);
      await this.prisma.tenantBackup.update({
        where: { id: backupId },
        data: { restoreStatus: 'FAILED' },
      });
      throw error;
    } finally {
      // Clean up decrypted temp file
      if (decryptedTmp && fs.existsSync(decryptedTmp)) {
        try { fs.unlinkSync(decryptedTmp); } catch {}
      }
    }
  }

  /**
   * Check restore approval status for a backup
   */
  async getRestoreStatus(backupId: number) {
    const backup = await this.prisma.tenantBackup.findUnique({ where: { id: backupId } });
    if (!backup) throw new NotFoundException('Backup not found');
    return {
      restoreStatus: backup.restoreStatus,
      restoreTarget: backup.restoreTarget,
      requestedById: backup.requestedById,
    };
  }

  // ==========================================================================
  // UPLOAD EXTERNAL BACKUP
  // ==========================================================================

  async uploadExternalBackup(
    tenantId: string,
    createdBy: string,
    file: Express.Multer.File,
    notes?: string,
  ) {
    // Validate extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.dump') {
      throw new BadRequestException('Only .dump files are allowed. Please export your backup in PostgreSQL custom format.');
    }

    // Validate size (max 500MB)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed is 500 MB.`);
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const schemaName = tenant.schemaName.replace(/[^a-z0-9_]/gi, '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${tenant.slug}_upload_${timestamp}.dump`;
    const backupDir = this.getBackupDir();
    const filepath = path.join(backupDir, filename);

    // Write file to disk
    fs.writeFileSync(filepath, file.buffer);

    // Validate it's a real pg_dump custom-format file
    try {
      const db = this.getDbConfig();
      const { pgRestore } = this.getPgBinaries();
      await execAsync(`${pgRestore} --list "${filepath}"`, {
        env: { ...process.env, PGPASSWORD: db.password },
        timeout: 30_000,
      });
    } catch {
      // Clean up invalid file
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      throw new BadRequestException(
        'Invalid backup file. The file must be a PostgreSQL custom-format dump (.dump). ' +
        'Use pg_dump with --format=custom to create a compatible backup.',
      );
    }

    const checksum = await this.calculateChecksum(filepath);
    const stats = fs.statSync(filepath);

    const retentionDays = this.getRetentionDays();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + retentionDays);

    const record = await this.prisma.tenantBackup.create({
      data: {
        tenantId,
        schemaName,
        filename,
        sizeBytes: BigInt(stats.size),
        checksum,
        status: 'completed',
        createdBy,
        isScheduled: false,
        notes: notes ? `[Uploaded] ${notes}` : '[Uploaded] External backup file',
        expiresAt,
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });

    this.logger.log(`External backup uploaded: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    return this.serialiseBackup(record);
  }

  // ==========================================================================
  // SUPER ADMIN: APPROVE RESTORE STEP
  // ==========================================================================

  async approveRestoreStep(backupId: number, userId: number) {
    const isAdmin = await isSuperAdmin(this.tenantPrisma, userId);
    if (!isAdmin) {
      throw new ForbiddenException('You do not have permission to perform this task. Please contact your Super Admin.');
    }

    const backup = await this.prisma.tenantBackup.findUnique({ where: { id: backupId } });
    if (!backup) throw new NotFoundException('Backup not found');
    if (backup.restoreStatus !== 'PENDING_APPROVAL') {
      throw new BadRequestException('This backup does not have a pending restore request.');
    }

    // Approve via the approval service and execute restore
    await this.prisma.tenantBackup.update({
      where: { id: backupId },
      data: { restoreStatus: 'APPROVED' },
    });

    const result = await this.executeRestore(backupId, backup.restoreTarget || backup.tenantId);

    this.logger.log(`Super Admin (user ${userId}) approved restore step for backup #${backupId}`);
    return { success: true, message: `Restore approved and executed. ${result.message}` };
  }

  // ==========================================================================
  // SUPER ADMIN: OVERRIDE RESTORE (SKIP ALL STEPS)
  // ==========================================================================

  async overrideRestore(backupId: number, userId: number, reason: string) {
    const isAdmin = await isSuperAdmin(this.tenantPrisma, userId);
    if (!isAdmin) {
      throw new ForbiddenException('You do not have permission to perform this task. Please contact your Super Admin.');
    }

    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException('Override reason is required (minimum 5 characters).');
    }

    const backup = await this.prisma.tenantBackup.findUnique({ where: { id: backupId } });
    if (!backup) throw new NotFoundException('Backup not found');
    if (backup.status !== 'completed') {
      throw new BadRequestException('Only completed backups can be restored.');
    }

    const targetTenantId = backup.restoreTarget || backup.tenantId;
    const overrideNote = `[SUPER ADMIN OVERRIDE] ${reason.trim()}`;
    const existingNotes = backup.notes || '';

    // Update backup with override info
    await this.prisma.tenantBackup.update({
      where: { id: backupId },
      data: {
        restoreStatus: 'OVERRIDE',
        notes: existingNotes ? `${existingNotes}\n${overrideNote}` : overrideNote,
      },
    });

    // Execute restore directly
    const result = await this.executeRestore(backupId, targetTenantId);

    this.logger.warn(`Super Admin OVERRIDE restore: user ${userId} overrode backup #${backupId} — ${reason}`);
    return { success: true, message: `Restore override executed. ${result.message}` };
  }

  async deleteBackup(id: number) {
    const backup = await this.prisma.tenantBackup.findUnique({ where: { id } });
    if (!backup) throw new NotFoundException('Backup not found');

    const filepath = path.join(this.getBackupDir(), backup.filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    await this.prisma.tenantBackup.update({
      where: { id },
      data: { status: 'deleted' },
    });
  }
}
