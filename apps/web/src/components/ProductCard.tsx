import Link from 'next/link';
import { discountPercent, type ProductCard as P } from '@/lib/api';
import { price } from '@/lib/format';
import type { Dict, Locale } from '@/lib/i18n';
import { CardCartButton, FavoriteButton } from './CardActions';
import { ProductBadges } from './ProductBadges';
import { ProductImage } from './ProductImage';
import { Scroller } from './Scroller';

export function ProductCard({ p, locale, t }: { p: P; locale: Locale; t: Dict }) {
  const href = `/${locale}/product/${p.slug}`;
  const off = discountPercent(p.price, p.oldPrice);
  return (
    <article className="group relative flex h-full flex-col">
      <Link href={href} className="relative block overflow-hidden rounded-2xl bg-surface">
        <ProductImage src={p.image} alt={p.title} className="aspect-square p-4 mix-blend-multiply transition duration-300 group-hover:scale-[1.04]" />
        <ProductBadges isNew={p.isNew} isTrending={p.isTrending} t={t} className="absolute left-2 top-2" />
        {off > 0 && p.inStock && <span className="absolute bottom-2 left-2 rounded-lg bg-sale-600 px-1.5 py-0.5 text-xs font-bold text-white">−{off}%</span>}
        {!p.inStock && (
          <span className="absolute inset-x-2 bottom-2 rounded-lg bg-white/90 py-1 text-center text-xs font-medium text-slate-600">{t.outOfStock}</span>
        )}
      </Link>
      <FavoriteButton productId={p.id} locale={locale} className="absolute right-2 top-2" />

      {/* Har bir qator balandligi qat'iy: kartochkalar qo'shni ustunlarda bir xil chiqadi. */}
      <div className="flex flex-1 flex-col px-0.5 pt-2.5">
        <div className="flex h-7 items-baseline gap-x-1.5 overflow-hidden whitespace-nowrap">
          <span className={`text-base font-extrabold sm:text-lg ${off ? 'text-sale-600' : ''}`}>
            {p.variantCount > 1 && <span className="mr-1 text-xs font-medium text-slate-500">{t.from}</span>}
            {price(p.price, t.sum)}
          </span>
          {p.oldPrice && off > 0 && <span className="truncate text-xs text-slate-400 line-through">{price(p.oldPrice, t.sum)}</span>}
        </div>
        <Link href={href} className="mt-0.5 line-clamp-2 h-10 text-sm leading-5 text-slate-800 hover:text-brand-700" title={p.title}>
          {p.title}
        </Link>
        <span className="mt-1 h-4 truncate text-xs leading-4 text-slate-500">
          {p.packSize}
          {p.manufacturer && ` · ${p.manufacturer}`}
        </span>
        <div className="mt-auto pt-3">
          <CardCartButton p={p} href={href} locale={locale} t={t} />
        </div>
      </div>
    </article>
  );
}

// Bitta gorizontal aylanadigan qator. Kartochka kengligi ProductGrid ustunlari bilan bir xil.
export function ProductShelf({ items, locale, t }: { items: P[]; locale: Locale; t: Dict }) {
  return (
    <Scroller className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:scroll-px-0 sm:gap-4 sm:px-0">
      {items.map((p) => (
        <div key={p.id} className="w-[calc((100%-0.75rem)/2.2)] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-4rem)/5)]">
          <ProductCard p={p} locale={locale} t={t} />
        </div>
      ))}
    </Scroller>
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
