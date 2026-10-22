'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuthed } from '@/components/useAuthed';
import { api } from '@/lib/client';
import { date, price } from '@/lib/format';
import { dict, orderStatusLabel, type Locale } from '@/lib/i18n';

interface Order {
  id: number;
  status: string;
  cancelledBy: string | null;
  total: number;
  createdAt: string;
  items: { title: string; qty: number }[];
}

export default function OrdersPage() {
  const { locale } = useParams<{ locale: Locale }>();
  const t = dict(locale);
  const session = useAuthed();
  const [orders, setOrders] = useState<Order[]>();

  useEffect(() => {
    if (session) api<Order[]>('/orders').then(setOrders);
  }, [session]);

  if (!orders) return null;
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      <h1 className="text-xl font-bold">{t.orders}</h1>
      {orders.length === 0 && <p className="card p-8 text-center text-slate-500">{t.noOrders}</p>}
      {orders.map((o) => (
        <Link key={o.id} href={`/${locale}/orders/${o.id}`} className="card flex flex-wrap items-center gap-3 p-4 hover:border-brand-500">
          <span className="font-semibold">
            {t.orderNo} · {date(o.createdAt, locale)}
          </span>
          <StatusBadge status={o.status} label={orderStatusLabel(t, o)} />
          <span className="ml-auto font-semibold">{price(o.total, t.sum)}</span>
          <span className="w-full truncate text-sm text-slate-500">{o.items.map((i) => `${i.title} × ${i.qty}`).join(', ')}</span>
        </Link>
      ))}
    </div>
  );
}
