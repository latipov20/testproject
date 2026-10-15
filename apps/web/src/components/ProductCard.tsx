import Link from 'next/link';
import type { ProductCard as P } from '@/lib/api';
import { price } from '@/lib/format';
import type { Dict, Locale } from '@/lib/i18n';
import { ProductBadges } from './ProductBadges';
import { ProductImage } from './ProductImage';

export function ProductCard({ p, locale, t }: { p: P; locale: Locale; t: Dict }) {
  return (
    <Link href={`/${locale}/product/${p.slug}`} className="card group relative flex flex-col overflow-hidden transition hover:shadow-md">
      <ProductImage src={p.image} alt={p.title} className="aspect-square" />
      <ProductBadges isNew={p.isNew} isTrending={p.isTrending} t={t} className="absolute left-2 top-2" />
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="line-clamp-2 text-sm font-medium group-hover:text-brand-700">{p.title}</span>
        <span className="text-xs text-slate-500">{p.packSize}</span>
        <div className="mt-auto pt-2">
          {p.oldPrice && <span className="mr-2 text-xs text-slate-400 line-through">{price(p.oldPrice, t.sum)}</span>}
          <span className="font-bold">{price(p.price, t.sum)}</span>
          {!p.inStock && <span className="ml-2 text-xs text-red-500">{t.outOfStock}</span>}
        </div>
      </div>
    </Link>
  );
}
