import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { MobileNav } from '@/components/MobileNav';
import { apiGet, type Category } from '@/lib/api';
import { dict, isLocale, locales } from '@/lib/i18n';
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

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict(locale);
  // API vaqtincha ishlamasa ham sahifa ochilsin: menyu bo'sh qoladi.
  const categories = await apiGet<Category[]>('/categories', locale).catch(() => [] as Category[]);
  return (
    <html lang={locale} className={inter.variable}>
      <body className="min-h-screen pb-16 md:pb-0">
        <Header locale={locale} t={t} categories={categories} />
        <main className="mx-auto max-w-7xl px-4 py-5 sm:py-6">{children}</main>
        <Footer locale={locale} t={t} categories={categories} />
        <MobileNav locale={locale} t={t} />
      </body>
    </html>
  );
}
