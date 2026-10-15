import { Search, ShieldCheck, Truck } from 'lucide-react';
import Link from 'next/link';
import type { Category } from '@/lib/api';
import type { Dict, Locale } from '@/lib/i18n';
import { CatalogMenu } from './CatalogMenu';
import { HeaderActions, LangSwitch } from './HeaderActions';

export function Logo({ locale }: { locale: Locale }) {
  return (
    <Link href={`/${locale}`} className="flex shrink-0 items-center gap-2" aria-label="Vet Products">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-black text-white shadow-sm">V</span>
      <span className="hidden text-xl font-extrabold tracking-tight sm:block">
        vet<span className="text-brand-600">products</span>
      </span>
    </Link>
  );
}

export function Header({ locale, t, categories }: { locale: Locale; t: Dict; categories: Category[] }) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
      {/* Yuqori ingichka qator */}
      <div className="hidden border-b border-slate-100 bg-surface/60 text-xs text-slate-600 md:block">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-1.5">
          <span className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-brand-600" /> {t.deliveryAll}
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-600" /> {t.officialOnly}
          </span>
          <LangSwitch locale={locale} className="ml-auto" />
        </div>
      </div>

      {/* Asosiy qator: logo, katalog, qidiruv, ikonkalar */}
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:gap-4">
        <Logo locale={locale} />
        <CatalogMenu locale={locale} t={t} categories={categories} />
        <form action={`/${locale}/catalog`} className="flex min-w-0 flex-1 items-center rounded-2xl border-2 border-brand-600 bg-white focus-within:ring-4 focus-within:ring-brand-100">
          <input name="q" placeholder={t.search} className="min-w-0 flex-1 rounded-2xl bg-transparent px-4 py-2.5 text-sm outline-none" aria-label={t.search} />
          <button className="m-1 flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 sm:px-4" aria-label={t.find}>
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">{t.find}</span>
          </button>
        </form>
        <HeaderActions locale={locale} t={t} />
      </div>

      {/* Kategoriyalar qatori */}
      <nav className="border-b border-slate-100">
        <div className="no-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
          <Link href={`/${locale}/catalog?tag=trending`} className="whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold text-sale-600 hover:bg-sale-50">
            🔥 {t.badgeTrending}
          </Link>
          <Link href={`/${locale}/catalog?tag=new`} className="whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold text-brand-700 hover:bg-brand-50">
            ✨ {t.badgeNew}
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/${locale}/catalog?category=${c.slug}`} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-slate-700 hover:bg-surface">
              {c.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
