'use client';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ProductImage } from '@/components/ProductImage';
import { useAuthed } from '@/components/useAuthed';
import { api } from '@/lib/client';
import { price } from '@/lib/format';
import { dict, type Locale } from '@/lib/i18n';
import { refreshShop } from '@/lib/shop';

interface Cart {
  items: { variantId: number; qty: number; price: number; packSize: string; title: string; slug: string; image: string | null; stock: number }[];
  itemsTotal: number;
}

export default function CartPage() {
  const { locale } = useParams<{ locale: Locale }>();
  const t = dict(locale);
  const session = useAuthed();
  const [cart, setCart] = useState<Cart>();

  const load = useCallback(() => api<Cart>('/cart', { locale }).then(setCart), [locale]);
  useEffect(() => {
    if (session) load();
  }, [session, load]);

  const setQty = async (variantId: number, qty: number) => {
    await api('/cart/items', { method: 'PUT', body: { variantId, qty } });
    await Promise.all([load(), refreshShop()]);
  };

  if (!cart) return null;
  if (!cart.items.length) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl bg-surface p-12 text-center">
        <ShoppingBag className="h-12 w-12 text-brand-600" />
        <p className="text-slate-600">{t.cartEmpty}</p>
        <Link href={`/${locale}/catalog`} className="btn">
          {t.continueShopping}
        </Link>
      </div>
    );
  }

  const count = cart.items.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        {t.cart} <span className="text-base font-medium text-slate-500">{count}</span>
      </h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="flex flex-col divide-y divide-slate-100 rounded-3xl border border-slate-200 bg-white">
          {cart.items.map((i) => (
            <div key={i.variantId} className="flex gap-4 p-4">
              <Link href={`/${locale}/product/${i.slug}`} className="shrink-0 overflow-hidden rounded-2xl bg-surface">
                <ProductImage src={i.image} alt={i.title} className="h-24 w-24 p-2 mix-blend-multiply" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={`/${locale}/product/${i.slug}`} className="line-clamp-2 text-sm font-medium hover:text-brand-700">
                  {i.title}
                </Link>
                <span className="text-xs text-slate-500">
                  {t.packSize}: {i.packSize}
                </span>
                {i.qty > i.stock && <span className="text-xs font-medium text-sale-600">{t.outOfStock}</span>}
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
                  <div className="flex items-center rounded-xl bg-surface">
                    <button className="flex h-9 w-9 items-center justify-center" onClick={() => setQty(i.variantId, i.qty - 1)} aria-label="−">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-7 text-center text-sm font-semibold">{i.qty}</span>
                    <button
                      className="flex h-9 w-9 items-center justify-center disabled:opacity-30"
                      disabled={i.qty >= i.stock}
                      onClick={() => setQty(i.variantId, Math.min(i.stock, i.qty + 1))}
                      aria-label="+"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button className="flex items-center gap-1 text-xs text-slate-500 hover:text-sale-600" onClick={() => setQty(i.variantId, 0)}>
                    <Trash2 className="h-4 w-4" /> {t.remove}
                  </button>
                </div>
              </div>
              <span className="whitespace-nowrap text-right font-bold">{price(i.price * i.qty, t.sum)}</span>
            </div>
          ))}
        </section>
        <aside className="flex h-fit flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-card lg:sticky lg:top-36">
          <div className="flex justify-between text-sm text-slate-600">
            <span>
              {t.itemsTotal} ({count})
            </span>
            <span>{price(cart.itemsTotal, t.sum)}</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-slate-100 pt-4">
            <span className="text-lg font-bold">{t.total}</span>
            <span className="text-2xl font-extrabold">{price(cart.itemsTotal, t.sum)}</span>
          </div>
          <p className="text-xs text-slate-500">{t.deliveryText}</p>
          <Link href={`/${locale}/checkout`} className="btn w-full py-3.5 text-base">
            {t.checkout}
          </Link>
        </aside>
      </div>
    </div>
  );
}
