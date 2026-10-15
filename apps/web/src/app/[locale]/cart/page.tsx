'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ProductImage } from '@/components/ProductImage';
import { useAuthed } from '@/components/useAuthed';
import { api } from '@/lib/client';
import { price } from '@/lib/format';
import { dict, type Locale } from '@/lib/i18n';

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
    load();
  };

  if (!cart) return null;
  if (!cart.items.length) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <p className="mb-4 text-slate-500">{t.cartEmpty}</p>
        <Link href={`/${locale}/catalog`} className="btn">
          {t.continueShopping}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="flex flex-col gap-3">
        <h1 className="text-xl font-bold">{t.cart}</h1>
        {cart.items.map((i) => (
          <div key={i.variantId} className="card flex items-center gap-3 p-3">
            <ProductImage src={i.image} alt={i.title} className="h-16 w-16 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <Link href={`/${locale}/product/${i.slug}`} className="line-clamp-1 text-sm font-medium hover:text-brand-700">
                {i.title}
              </Link>
              <span className="text-xs text-slate-500">{i.packSize}</span>
              {i.qty > i.stock && <span className="block text-xs text-red-500">{t.outOfStock}</span>}
            </div>
            <div className="flex items-center rounded-xl border border-slate-200">
              <button className="px-2.5 py-1.5" onClick={() => setQty(i.variantId, i.qty - 1)}>
                −
              </button>
              <span className="w-7 text-center text-sm">{i.qty}</span>
              <button className="px-2.5 py-1.5" onClick={() => setQty(i.variantId, Math.min(i.stock, i.qty + 1))}>
                +
              </button>
            </div>
            <span className="w-28 text-right text-sm font-semibold">{price(i.price * i.qty, t.sum)}</span>
          </div>
        ))}
      </section>
      <aside className="card h-fit p-5">
        <div className="flex justify-between text-lg font-bold">
          <span>{t.itemsTotal}</span>
          <span>{price(cart.itemsTotal, t.sum)}</span>
        </div>
        <Link href={`/${locale}/checkout`} className="btn mt-4 w-full">
          {t.checkout}
        </Link>
      </aside>
    </div>
  );
}
