'use client';
import { Check, Heart, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ProductCard } from '@/lib/api';
import type { Dict, Locale } from '@/lib/i18n';
import { addToCart, toggleFavorite, useShop } from '@/lib/shop';

const loginHref = (locale: Locale) => `/${locale}/login?next=${encodeURIComponent(location.pathname + location.search)}`;

export function FavoriteButton({ productId, locale, className = '' }: { productId: number; locale: Locale; className?: string }) {
  const router = useRouter();
  const { favorites } = useShop();
  const on = favorites.has(productId);
  return (
    <button
      type="button"
      aria-label="♡"
      aria-pressed={on}
      onClick={async () => {
        if (!(await toggleFavorite(productId))) router.push(loginHref(locale));
      }}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:scale-110 ${className}`}
    >
      <Heart className={`h-5 w-5 ${on ? 'fill-sale-600 text-sale-600' : 'text-slate-500'}`} />
    </button>
  );
}

// Bitta qadoqli mahsulot kartochkadan to'g'ridan-to'g'ri savatga tushadi, bir nechta bo'lsa mahsulot sahifasida tanlanadi.
export function CardCartButton({ p, href, locale, t }: { p: ProductCard; href: string; locale: Locale; t: Dict }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');

  if (!p.inStock && p.variantCount <= 1) {
    return (
      <span className="btn-soft w-full cursor-default py-2 text-slate-400 hover:bg-surface" aria-disabled>
        {t.outOfStock}
      </span>
    );
  }
  if (p.variantCount > 1 || !p.variantId) {
    return (
      <Link href={href} className="btn-soft w-full py-2">
        {t.choose}
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled={!p.inStock || state === 'busy'}
      onClick={async () => {
        setState('busy');
        try {
          if (!(await addToCart(p.variantId!))) return router.push(loginHref(locale));
          setState('done');
          setTimeout(() => setState('idle'), 2000);
        } catch {
          setState('idle');
        }
      }}
      className={`btn w-full py-2 ${state === 'done' ? 'bg-brand-700' : ''}`}
    >
      {state === 'done' ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
      {state === 'done' ? t.added : p.inStock ? t.toCart : t.outOfStock}
    </button>
  );
}
