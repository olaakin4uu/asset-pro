import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { brand } from '../config/brand';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private zeptoToken: string | null = null;
  private fromEmail: string;
  private fromName: string;

  constructor(private configService: ConfigService) {
    this.fromName = this.configService.get('SMTP_FROM_NAME', brand.fromName);
    this.fromEmail = this.configService.get('SMTP_FROM_EMAIL', brand.fromEmail);
    this.initTransporter();
  }

  private initTransporter(): void {
    // Check for ZeptoMail API token first (preferred)
    this.zeptoToken = this.configService.get<string>('ZEPTO_MAIL_TOKEN') || null;
    if (this.zeptoToken) {
      this.logger.log('Email configured: ZeptoMail API mode');
      return;
    }

    // Fall back to SMTP (works with ZeptoMail SMTP or any provider)
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');

    if (!host || !user) {
      this.logger.warn('Email not configured — emails will be logged but not sent');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    this.logger.log(`Email configured: SMTP ${host}:${port}`);
  }

  async send(options: SendMailOptions): Promise<boolean> {
    const to = Array.isArray(options.to) ? options.to : [options.to];

    // ZeptoMail API mode
    if (this.zeptoToken) {
      return this.sendViaZepto(to, options);
    }

    // SMTP mode
    if (this.transporter) {
      return this.sendViaSMTP(to.join(', '), options);
    }

    // Log-only mode
    this.logger.log(`[EMAIL-LOG] To: ${to.join(', ')} | Subject: ${options.subject}`);
    return true;
  }

  private async sendViaZepto(to: string[], options: SendMailOptions): Promise<boolean> {
    try {
      const body = {
        from: { address: this.fromEmail, name: this.fromName },
        to: to.map((email) => ({ email_address: { address: email, name: '' } })),
        subject: options.subject,
        htmlbody: options.html,
        textbody: options.text || '',
      };

      const response = await fetch('https://api.zeptomail.com/v1.1/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Zoho-encrtoken ${this.zeptoToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.text();
        this.logger.error(`ZeptoMail error: ${response.status} ${err}`);
        return false;
      }

      this.logger.log(`Email sent via ZeptoMail to ${to.join(', ')}: ${options.subject}`);
      return true;
    } catch (error) {
      this.logger.error(`ZeptoMail failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  private async sendViaSMTP(to: string, options: SendMailOptions): Promise<boolean> {
    try {
      const info = await this.transporter!.sendMail({
        from: `${this.fromName} <${this.fromEmail}>`,
        to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        attachments: options.attachments,
      });
      this.logger.log(`Email sent via SMTP to ${to}: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`SMTP failed to ${to}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null || this.zeptoToken !== null;
  }

  // ==========================================================================
  // TEMPLATE EMAILS
  // ==========================================================================

  async sendWelcome(params: { email: string; name: string; companyName: string; subdomain: string; loginUrl: string }): Promise<boolean> {
    return this.send({
      to: params.email,
      subject: `Welcome to ${brand.appName} — ${params.companyName} is ready!`,
      html: this.wrapTemplate(`
        <h2 style="color:#1e40af;margin:0 0 8px;">Welcome, ${params.name}!</h2>
        <p>Your company <strong>${params.companyName}</strong> has been set up successfully on ${brand.appName}.</p>
        <div style="background:#f0f9ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0 0 8px;"><strong>Your Portal:</strong></p>
          <a href="${params.loginUrl}" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-weight:600;">Log In to ${params.subdomain}.${brand.companyDomain}</a>
        </div>
        <p><strong>Quick start checklist:</strong></p>
        <ul style="padding-left:20px;">
          <li>Set up your company profile and logo</li>
          <li>Add your first employees</li>
          <li>Configure your chart of accounts</li>
          <li>Import inventory items</li>
        </ul>
        <p style="color:#6b7280;font-size:13px;">Need help? Visit our <a href="https://${brand.companyDomain}/faq">FAQ</a> or contact support.</p>
      `),
      text: `Welcome ${params.name}! Your company ${params.companyName} is ready. Log in at ${params.loginUrl}`,
    });
  }

  async sendPasswordReset(params: { email: string; name: string; resetUrl: string; expiresIn: string }): Promise<boolean> {
    return this.send({
      to: params.email,
      subject: `Reset your ${brand.appName} password`,
      html: this.wrapTemplate(`
        <h2 style="color:#1e40af;margin:0 0 8px;">Password Reset</h2>
        <p>Hi ${params.name}, we received a request to reset your password.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${params.resetUrl}" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;">Reset Password</a>
        </div>
        <p style="color:#6b7280;font-size:13px;">This link expires in ${params.expiresIn}. If you didn't request this, ignore this email.</p>
      `),
      text: `Reset your password: ${params.resetUrl} (expires in ${params.expiresIn})`,
    });
  }

  async sendApprovalNotification(params: { email: string; name: string; actionType: 'pending' | 'approved' | 'rejected'; entityType: string; entityNumber: string; comment?: string; actionUrl: string }): Promise<boolean> {
    const colors = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444' };
    const labels = { pending: 'Pending Your Approval', approved: 'Approved', rejected: 'Rejected' };
    const color = colors[params.actionType];
    const label = labels[params.actionType];

    return this.send({
      to: params.email,
      subject: `${label}: ${params.entityType} ${params.entityNumber}`,
      html: this.wrapTemplate(`
        <h2 style="color:${color};margin:0 0 8px;">${label}</h2>
        <p>Hi ${params.name},</p>
        <p><strong>${params.entityType}</strong> <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">${params.entityNumber}</code> ${params.actionType === 'pending' ? 'requires your approval.' : `has been ${params.actionType}.`}</p>
        ${params.comment ? `<div style="background:#f9fafb;border-left:3px solid ${color};padding:12px;margin:12px 0;"><em>"${params.comment}"</em></div>` : ''}
        <div style="text-align:center;margin:20px 0;">
          <a href="${params.actionUrl}" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-weight:600;">View Details</a>
        </div>
      `),
      text: `${label}: ${params.entityType} ${params.entityNumber}. View at ${params.actionUrl}`,
    });
  }

  async sendPaymentReceipt(params: { email: string; name: string; planName: string; amount: string; currency: string; invoiceNumber: string; invoiceDate: string; nextBillingDate: string }): Promise<boolean> {
    return this.send({
      to: params.email,
      subject: `Payment Receipt — ${params.invoiceNumber}`,
      html: this.wrapTemplate(`
        <h2 style="color:#22c55e;margin:0 0 8px;">Payment Received</h2>
        <p>Hi ${params.name}, your payment has been processed successfully.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;">Plan</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600;">${params.planName}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;">Amount</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600;">${params.currency} ${params.amount}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;">Invoice</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${params.invoiceNumber}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;">Date</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${params.invoiceDate}</td></tr>
          <tr><td style="padding:8px;color:#6b7280;">Next Billing</td><td style="padding:8px;">${params.nextBillingDate}</td></tr>
        </table>
      `),
      text: `Payment received: ${params.currency} ${params.amount} for ${params.planName}. Invoice: ${params.invoiceNumber}`,
    });
  }

  async sendTrialExpiring(params: { email: string; name: string; companyName: string; daysLeft: number; upgradeUrl: string }): Promise<boolean> {
    return this.send({
      to: params.email,
      subject: `Your ${brand.appName} trial expires in ${params.daysLeft} days`,
      html: this.wrapTemplate(`
        <h2 style="color:#f59e0b;margin:0 0 8px;">Trial Expiring Soon</h2>
        <p>Hi ${params.name},</p>
        <p>Your free trial for <strong>${params.companyName}</strong> expires in <strong>${params.daysLeft} day${params.daysLeft > 1 ? 's' : ''}</strong>.</p>
        <p>Upgrade now to keep all your data and continue using ${brand.appName} without interruption.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${params.upgradeUrl}" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;">Upgrade Now</a>
        </div>
      `),
      text: `Your trial for ${params.companyName} expires in ${params.daysLeft} days. Upgrade at ${params.upgradeUrl}`,
    });
  }

  async sendInvite(params: { to: string; name: string; inviteUrl: string; invitedBy: string; companyName: string; expiresIn: string }): Promise<boolean> {
    return this.send({
      to: params.to,
      subject: `You've been invited to join ${params.companyName} on SalvagePro`,
      html: this.wrapTemplate(`
        <h2 style="color:#1e40af;margin:0 0 8px;">You're Invited!</h2>
        <p>Hi ${params.name},</p>
        <p><strong>${params.invitedBy}</strong> has invited you to access <strong>${params.companyName}</strong> on SalvagePro ERP.</p>
        <p>Click the button below to set your password and activate your account:</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${params.inviteUrl}" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;">Accept Invitation</a>
        </div>
        <p style="color:#6b7280;font-size:13px;">This invitation expires in ${params.expiresIn}. If you didn't expect this, you can safely ignore it.</p>
      `),
      text: `Hi ${params.name}, ${params.invitedBy} invited you to join ${params.companyName} on SalvagePro. Accept at: ${params.inviteUrl} (expires in ${params.expiresIn})`,
    });
  }

  /**
   * Send RFQ to a supplier
   */
  async sendRfqToSupplier(params: {
    supplierName: string; supplierEmail: string; rfqNumber: string; companyName: string;
    closingDate: string; items: Array<{ name: string; quantity: number; specifications?: string }>; notes?: string;
  }): Promise<boolean> {
    const itemRows = params.items.map((item, i) =>
      `<tr><td style="padding:8px;border:1px solid #e5e7eb;">${i + 1}</td><td style="padding:8px;border:1px solid #e5e7eb;">${item.name}</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${item.quantity}</td><td style="padding:8px;border:1px solid #e5e7eb;">${item.specifications || '-'}</td></tr>`
    ).join('');

    return this.send({
      to: params.supplierEmail,
      subject: `Request for Quotation - ${params.rfqNumber} from ${params.companyName}`,
      html: this.wrapTemplate(`
        <h2 style="color:#1e40af;margin:0 0 8px;">Request for Quotation</h2>
        <p style="color:#6b7280;">${params.rfqNumber}</p>
        <p>Dear <strong>${params.supplierName}</strong>,</p>
        <p>${params.companyName} invites you to submit a quotation for the following items:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <thead><tr style="background:#f3f4f6;"><th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">#</th><th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Item</th><th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">Qty</th><th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Specifications</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        ${params.notes ? `<p><strong>Notes:</strong> ${params.notes}</p>` : ''}
        <p><strong>Closing Date:</strong> ${new Date(params.closingDate).toLocaleDateString()}</p>
      `),
      text: `Dear ${params.supplierName}, ${params.companyName} invites you to submit a quotation for ${params.items.length} item(s). RFQ: ${params.rfqNumber}. Closing: ${params.closingDate}`,
    });
  }

  // ==========================================================================
  // HTML WRAPPER
  // ==========================================================================

  private wrapTemplate(body: string): string {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:20px 24px;">
      <img src="https://${brand.companyDomain}/logo-white.png" alt="${brand.appName}" style="height:28px;" onerror="this.style.display='none'">
    </div>
    <div style="padding:24px;">${body}</div>
    <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:11px;">${brand.appName} &middot; <a href="https://${brand.companyDomain}" style="color:#3b82f6;">${brand.companyDomain}</a></p>
    </div>
  </div>
</body></html>`;
  }
}
