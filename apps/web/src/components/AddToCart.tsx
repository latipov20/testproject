'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, getSession } from '@/lib/client';
import { price } from '@/lib/format';
import type { Dict, Locale } from '@/lib/i18n';

interface Variant {
  id: number;
  packSize: string;
  price: number;
  oldPrice: number | null;
  stock: number;
}

export function AddToCart({ variants, locale, t }: { variants: Variant[]; locale: Locale; t: Dict }) {
  const router = useRouter();
  const [selected, setSelected] = useState(variants.find((v) => v.stock > 0) ?? variants[0]);
  const [qty, setQty] = useState(1);
  const [state, setState] = useState<'idle' | 'busy' | 'done' | string>('idle');

  if (!selected) return null;

  const add = async () => {
    if (!getSession()) {
      router.push(`/${locale}/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setState('busy');
    try {
      const cart = await api<{ items: { variantId: number; qty: number }[] }>('/cart');
      const current = cart.items.find((i) => i.variantId === selected.id)?.qty ?? 0;
      await api('/cart/items', { method: 'PUT', body: { variantId: selected.id, qty: Math.min(99, current + qty) } });
      setState('done');
    } catch (e) {
      setState((e as Error).message);
    }
  };

  return (
    <div className="card flex flex-col gap-4 p-4">
      {variants.length > 1 && (
        <div>
          <span className="mb-2 block text-sm text-slate-500">{t.packSize}</span>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelected(v)}
                className={`rounded-xl border px-3 py-2 text-sm ${v.id === selected.id ? 'border-brand-600 bg-brand-50 font-semibold' : 'border-slate-200'}`}
              >
                {v.packSize}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold">{price(selected.price, t.sum)}</span>
        {selected.oldPrice && <span className="text-slate-400 line-through">{price(selected.oldPrice, t.sum)}</span>}
        <span className={`ml-auto text-sm ${selected.stock > 0 ? 'text-brand-700' : 'text-red-500'}`}>
          {selected.stock > 0 ? t.inStock : t.outOfStock}
        </span>
      </div>
      <div className="flex gap-2">
        <div className="flex items-center rounded-xl border border-slate-200">
          <button className="px-3 py-2" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="-">
            −
          </button>
          <span className="w-8 text-center text-sm">{qty}</span>
          <button className="px-3 py-2" onClick={() => setQty(Math.min(selected.stock, qty + 1))} aria-label="+">
            +
          </button>
        </div>
        <button className="btn flex-1" disabled={selected.stock === 0 || state === 'busy'} onClick={add}>
          {state === 'done' ? t.added : t.addToCart}
        </button>
      </div>
      {!['idle', 'busy', 'done'].includes(state) && <p className="text-sm text-red-600">{state}</p>}
    </div>
  );
}
