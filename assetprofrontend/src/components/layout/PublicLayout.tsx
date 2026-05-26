'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  TrendingUp,
  ArrowRight,
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Handshake,
} from 'lucide-react';
import { brand } from '@/lib/brand';

interface PublicLayoutProps {
  children: React.ReactNode;
  siteName?: string;
  siteTagline?: string;
  footerDescription?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
}

export default function PublicLayout({
  children,
  siteName = brand.appName,
  siteTagline = 'Enterprise Solutions',
  footerDescription = 'Advanced Enterprise Resource Planning system designed for Nigerian businesses. IFRS-compliant, fully integrated, and built for scale.',
  contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || brand.supportEmail,
  contactPhone = '+234 800 000 0000',
  contactAddress = 'Lagos, Nigeria',
}: PublicLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const currentYear = new Date().getFullYear();

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/features', label: 'Solutions' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/faq', label: 'FAQ' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Announcement Bar */}
      <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white text-center py-2 px-4 text-sm">
        <span className="font-medium">New:</span> Advanced multi-level approval workflows now available.
        <Link href="/features" className="underline ml-1 hover:no-underline">
          Learn more
        </Link>
      </div>

      {/* Navigation */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b border-slate-200/50'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <Image src="/salvage-icon.png" alt={siteName} width={36} height={36} className="h-9 w-9" />
              <span className="text-2xl font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                {siteName}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-slate-600 transition-colors hover:text-red-600 relative group"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-red-600 transition-all group-hover:w-full" />
                </Link>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="hidden lg:flex items-center gap-4">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-500/40"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-slate-600" />
              ) : (
                <Menu className="h-6 w-6 text-slate-600" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="lg:hidden py-4 border-t border-slate-200">
              <div className="flex flex-col space-y-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-3 px-4">
                  <Link
                    href="/auth/register"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-lg"
                  >
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300">
        {/* Main Footer */}
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-4">
            {/* Brand Column */}
            <div className="lg:col-span-1">
              <Link href="/" className="inline-flex items-center gap-2 mb-6">
                <Image src="/salvage-icon.png" alt={siteName} width={36} height={36} className="h-9 w-9" />
                <span className="text-2xl font-bold text-white">{siteName}</span>
              </Link>
              <p className="text-slate-400 mb-6 leading-relaxed">{footerDescription}</p>
              {/* Social Links */}
              <div className="flex gap-4">
                <a
                  href="#"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-blue-600 transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-blue-400 transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-blue-700 transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-pink-600 transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Solutions Column */}
            <div>
              <h4 className="text-white font-semibold mb-6">Solutions</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="/features#accounting" className="hover:text-red-400 transition-colors">
                    Financial Management
                  </Link>
                </li>
                <li>
                  <Link href="/features#hrpayroll" className="hover:text-red-400 transition-colors">
                    HR & Payroll
                  </Link>
                </li>
                <li>
                  <Link href="/features#inventory" className="hover:text-red-400 transition-colors">
                    Inventory Control
                  </Link>
                </li>
                <li>
                  <Link href="/features#fleet" className="hover:text-red-400 transition-colors">
                    Fleet Management
                  </Link>
                </li>
                <li>
                  <Link href="/features#sales" className="hover:text-red-400 transition-colors">
                    Sales & CRM
                  </Link>
                </li>
                <li>
                  <Link href="/features#pos" className="hover:text-red-400 transition-colors">
                    Point of Sale
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h4 className="text-white font-semibold mb-6">Company</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="/about" className="hover:text-red-400 transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-red-400 transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-red-400 transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-red-400 transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-red-400 transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-red-400 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/partner/program"
                    className="hover:text-red-400 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Handshake className="h-4 w-4" />
                    Become a Partner
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Column */}
            <div>
              <h4 className="text-white font-semibold mb-6">Contact Us</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                  <a href={`mailto:${contactEmail}`} className="hover:text-red-400 transition-colors">
                    {contactEmail}
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                  <a href={`tel:${contactPhone}`} className="hover:text-red-400 transition-colors">
                    {contactPhone}
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                  <span>{contactAddress}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-slate-400">
                &copy; {currentYear} {siteName}. All rights reserved. Built for Nigerian excellence.
              </p>
              <div className="flex items-center gap-6 text-sm text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  All systems operational
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
