import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { dict, isLocale, locales } from '@/lib/i18n';
import '../globals.css';

export const metadata: Metadata = {
  title: { default: 'Vet Products', template: '%s · Vet Products' },
  description: 'Veterinariya dori-darmonlari va hayvonlar uchun mahsulotlar — butun O‘zbekiston bo‘ylab yetkazib berish.',
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict(locale);
  return (
    <html lang={locale}>
      <body className="min-h-screen">
        <Header locale={locale} t={t} />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mt-12 border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-slate-500">
            <span className="font-semibold text-slate-700">Vet Products</span>
            <span>{t.otcNote}</span>
            <span>latipov.org.uz</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
