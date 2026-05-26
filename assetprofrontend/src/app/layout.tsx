import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { TopLoader } from "@/components/TopLoader";
import { PrimeReactProvider } from "@/providers/PrimeReactProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { LocaleProvider } from "@/providers/LocaleProvider";
import { OfflineBanner } from "@/components/erp";
import { brand } from "@/lib/brand";
import "./globals.css";

const geistSans = { variable: GeistSans.variable };
const geistMono = { variable: GeistMono.variable };

export const metadata: Metadata = {
  title: `${brand.appName} - Fixed Asset Management`,
  description: "Multi-tenant Fixed Asset Management platform",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: brand.appNameShort,
  },
};

export const viewport: Viewport = {
  themeColor: "#1f3864",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TopLoader />
        <ThemeProvider>
          <QueryProvider>
            <PrimeReactProvider>
              <LocaleProvider>
                {children}
              </LocaleProvider>
            </PrimeReactProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
