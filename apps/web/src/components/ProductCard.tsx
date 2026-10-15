import Link from 'next/link';
import { discountPercent, type ProductCard as P } from '@/lib/api';
import { price } from '@/lib/format';
import type { Dict, Locale } from '@/lib/i18n';
import { CardCartButton, FavoriteButton } from './CardActions';
import { ProductBadges } from './ProductBadges';
import { ProductImage } from './ProductImage';

export function ProductCard({ p, locale, t }: { p: P; locale: Locale; t: Dict }) {
  const href = `/${locale}/product/${p.slug}`;
  const off = discountPercent(p.price, p.oldPrice);
  return (
    <article className="group relative flex h-full flex-col">
      <Link href={href} className="relative block overflow-hidden rounded-2xl bg-surface">
        <ProductImage src={p.image} alt={p.title} className="aspect-[4/5] p-3 mix-blend-multiply transition duration-300 group-hover:scale-[1.03]" />
        <ProductBadges isNew={p.isNew} isTrending={p.isTrending} t={t} className="absolute left-2 top-2" />
        {off > 0 && p.inStock && <span className="absolute bottom-2 left-2 rounded-lg bg-sale-600 px-1.5 py-0.5 text-xs font-bold text-white">−{off}%</span>}
        {!p.inStock && (
          <span className="absolute inset-x-2 bottom-2 rounded-lg bg-white/90 py-1 text-center text-xs font-medium text-slate-600">{t.outOfStock}</span>
        )}
      </Link>
      <FavoriteButton productId={p.id} locale={locale} className="absolute right-2 top-2" />

      <div className="flex flex-1 flex-col gap-1 px-0.5 pt-2.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className={`text-lg font-extrabold leading-tight ${off ? 'text-sale-600' : ''}`}>
            {p.variantCount > 1 && <span className="mr-1 text-xs font-medium text-slate-500">{t.from}</span>}
            {price(p.price, t.sum)}
          </span>
          {p.oldPrice && off > 0 && <span className="text-xs text-slate-400 line-through">{price(p.oldPrice, t.sum)}</span>}
        </div>
        <Link href={href} className="line-clamp-2 text-sm leading-snug text-slate-800 hover:text-brand-700">
          {p.title}
        </Link>
        <span className="text-xs text-slate-500">
          {p.packSize}
          {p.manufacturer && ` · ${p.manufacturer}`}
        </span>
        <div className="mt-auto pt-2">
          <CardCartButton p={p} href={href} locale={locale} t={t} />
        </div>
      </div>
    </article>
  );
}

// Gorizontal aylanadigan qator (telefonda) va katak (kompyuterda).
export function ProductShelf({ items, locale, t }: { items: P[]; locale: Locale; t: Dict }) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-5">
      {items.map((p) => (
        <div key={p.id} className="w-[44%] shrink-0 snap-start sm:w-auto">
          <ProductCard p={p} locale={locale} t={t} />
        </div>
      ))}
    </div>
  );
}

export function ProductGrid({ items, locale, t, cols = 'lg:grid-cols-5' }: { items: P[]; locale: Locale; t: Dict; cols?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 ${cols}`}>
      {items.map((p) => (
        <ProductCard key={p.id} p={p} locale={locale} t={t} />
      ))}
    </div>
  );
}
