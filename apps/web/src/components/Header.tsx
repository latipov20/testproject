import Link from 'next/link';
import type { Dict, Locale } from '@/lib/i18n';
import { HeaderActions } from './HeaderActions';

export function Header({ locale, t }: { locale: Locale; t: Dict }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">V</span>
          <span className="leading-tight">
            <span className="block font-bold">Vet Products</span>
            <span className="block text-xs text-slate-500">{t.brandTagline}</span>
          </span>
        </Link>
        <form action={`/${locale}/catalog`} className="order-last w-full sm:order-none sm:ml-4 sm:w-auto sm:flex-1">
          <input name="q" placeholder={t.search} className="input" />
        </form>
        <HeaderActions locale={locale} t={t} />
      </div>
    </header>
  );
}
