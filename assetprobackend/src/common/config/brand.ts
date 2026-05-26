export const brand = {
  appName: process.env.APP_NAME || 'AssetPro',
  appNameShort: process.env.APP_NAME_SHORT || 'AssetPro',
  companyDomain: process.env.COMPANY_DOMAIN || 'assetpro.io',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@assetpro.io',
  fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@assetpro.io',
  fromName: process.env.SMTP_FROM_NAME || 'AssetPro',
  totpIssuer: process.env.TOTP_ISSUER || 'AssetPro',
  smsSenderId: process.env.SMS_SENDER_ID || 'AssetPro',
} as const;
