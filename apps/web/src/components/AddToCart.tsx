'use client';
import { Check, Minus, Plus, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { discountPercent } from '@/lib/api';
import { price } from '@/lib/format';
import type { Dict, Locale } from '@/lib/i18n';
import { addToCart } from '@/lib/shop';
import { FavoriteButton } from './CardActions';

interface Variant {
  id: number;
  packSize: string;
  price: number;
  oldPrice: number | null;
  stock: number;
}

// Mahsulot sahifasidagi xarid bloki: qadoq tanlash, narx, soni, savatga qo'shish.
export function AddToCart({ productId, variants, locale, t }: { productId: number; variants: Variant[]; locale: Locale; t: Dict }) {
  const router = useRouter();
  const [selected, setSelected] = useState(variants.find((v) => v.stock > 0) ?? variants[0]);
  const [qty, setQty] = useState(1);
  const [state, setState] = useState<'idle' | 'busy' | 'done' | string>('idle');

  if (!selected) return null;
  const off = discountPercent(selected.price, selected.oldPrice);

  const add = async () => {
    setState('busy');
    try {
      if (!(await addToCart(selected.id, qty))) {
        router.push(`/${locale}/login?next=${encodeURIComponent(location.pathname)}`);
        return;
      }
      setState('done');
    } catch (e) {
      setState((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`text-3xl font-extrabold tracking-tight ${off ? 'text-sale-600' : ''}`}>{price(selected.price, t.sum)}</span>
        {off > 0 && (
          <>
            <span className="text-slate-400 line-through">{price(selected.oldPrice!, t.sum)}</span>
            <span className="rounded-lg bg-sale-600 px-1.5 py-0.5 text-xs font-bold text-white">−{off}%</span>
          </>
        )}
      </div>

      {variants.length > 1 && (
        <div>
          <span className="mb-2 block text-sm text-slate-500">
            {t.packSize}: <b className="text-slate-900">{selected.packSize}</b>
          </span>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => (setSelected(v), setQty(1), setState('idle'))}
                className={`rounded-xl border-2 px-3 py-2 text-left text-sm transition ${v.id === selected.id ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:border-slate-300'} ${v.stock === 0 ? 'opacity-50' : ''}`}
              >
                <span className="block font-semibold">{v.packSize}</span>
                <span className="text-xs text-slate-500">{price(v.price, t.sum)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <span className={`text-sm font-medium ${selected.stock > 0 ? 'text-brand-700' : 'text-sale-600'}`}>
        {selected.stock > 0 ? `✓ ${t.inStock}` : t.outOfStock}
      </span>

      {state === 'done' ? (
        <Link href={`/${locale}/cart`} className="btn w-full py-3.5 text-base">
          <Check className="h-5 w-5" /> {t.added} · {t.checkout}
        </Link>
      ) : (
        <div className="flex gap-2">
          <div className="flex items-center rounded-xl bg-surface">
            <button className="flex h-12 w-10 items-center justify-center disabled:opacity-30" disabled={qty <= 1} onClick={() => setQty(qty - 1)} aria-label="−">
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center font-semibold">{qty}</span>
            <button
              className="flex h-12 w-10 items-center justify-center disabled:opacity-30"
              disabled={qty >= Math.min(99, selected.stock)}
              onClick={() => setQty(qty + 1)}
              aria-label="+"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {selected.stock === 0 ? (
            <span className="btn-soft flex-1 cursor-default whitespace-nowrap py-3 text-base text-slate-400 hover:bg-surface">{t.outOfStock}</span>
          ) : (
            <button className="btn flex-1 whitespace-nowrap py-3 text-base" disabled={state === 'busy'} onClick={add}>
              <ShoppingBag className="h-5 w-5" /> {t.toCart}
            </button>
          )}
          <FavoriteButton productId={productId} locale={locale} className="h-12 w-12 bg-surface shadow-none" />
        </div>
      )}
      {!['idle', 'busy', 'done'].includes(state) && <p className="text-sm text-sale-600">{state}</p>}
    </div>
  );
}
