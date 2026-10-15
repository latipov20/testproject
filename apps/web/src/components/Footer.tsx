import Link from 'next/link';
import type { Category } from '@/lib/api';
import type { Dict, Locale } from '@/lib/i18n';
import { Logo } from './Header';

export function Footer({ locale, t, categories }: { locale: Locale; t: Dict; categories: Category[] }) {
  return (
    <footer className="mt-16 bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3">
          <Logo locale={locale} />
          <p className="text-slate-600">{t.brandTagline}</p>
          <p className="text-slate-500">{t.otcNote}</p>
        </div>
        <div>
          <h3 className="mb-3 font-semibold">{t.forBuyers}</h3>
          <ul className="flex flex-col gap-2 text-slate-600">
            <li>
              <Link href={`/${locale}/catalog`} className="hover:text-brand-700">
                {t.catalog}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/cart`} className="hover:text-brand-700">
                {t.cart}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/orders`} className="hover:text-brand-700">
                {t.orders}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/favorites`} className="hover:text-brand-700">
                {t.favorites}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-semibold">{t.categories}</h3>
          <ul className="flex flex-col gap-2 text-slate-600">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/${locale}/catalog?category=${c.slug}`} className="hover:text-brand-700">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="font-semibold">{t.paymentTitle}</h3>
          <div className="flex flex-wrap gap-2">
            {['Payme', 'Click', t.cash].map((m) => (
              <span key={m} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                {m}
              </span>
            ))}
          </div>
          <h3 className="mt-2 font-semibold">{t.deliveryTitle}</h3>
          <p className="text-slate-600">{t.deliveryAll}</p>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 py-4 text-xs text-slate-500">
          <span>
            © {new Date().getFullYear()} Vet Products · latipov.org.uz
          </span>
          <span>{t.rights}</span>
        </div>
      </div>
    </footer>
  );
}
