import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { isLocale, locales } from '@/lib/i18n';
import '../globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Vet Products', template: '%s · Vet Products' },
  description: 'Veterinariya dori-darmonlari va hayvonlar uchun mahsulotlar — butun O‘zbekiston bo‘ylab yetkazib berish.',
};

export const viewport: Viewport = { themeColor: '#059669', viewportFit: 'cover' };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Faqat umumiy qobiq. Do'kon (shop) va backstage (admin, kuryer) o'z layout'larini beradi.
export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} className={inter.variable}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
