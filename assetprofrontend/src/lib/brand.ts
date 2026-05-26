export const brand = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'AssetPro',
  appNameShort: process.env.NEXT_PUBLIC_APP_NAME_SHORT || 'AssetPro',
  companyDomain: process.env.NEXT_PUBLIC_COMPANY_DOMAIN || 'assetpro.io',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@assetpro.io',
} as const;
