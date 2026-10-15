import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { MobileNav } from '@/components/MobileNav';
import { apiGet, type Category } from '@/lib/api';
import { dict, type Locale } from '@/lib/i18n';

// Xaridorlar uchun do'kon: header, footer, telefon uchun pastki menyu.
// Til ildiz layout'da tekshirilgan (isLocale), shu yerga faqat uz/ru keladi.
export default async function ShopLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  const t = dict(locale);
  // API vaqtincha ishlamasa ham sahifa ochilsin: menyu bo'sh qoladi.
  const categories = await apiGet<Category[]>('/categories', locale).catch(() => [] as Category[]);
  return (
    <div className="pb-16 md:pb-0">
      <Header locale={locale} t={t} categories={categories} />
      <main className="mx-auto max-w-7xl px-4 py-5 sm:py-6">{children}</main>
      <Footer locale={locale} t={t} categories={categories} />
      <MobileNav locale={locale} t={t} />
    </div>
  );
}
