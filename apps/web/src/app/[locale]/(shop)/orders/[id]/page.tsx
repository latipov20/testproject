'use client';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuthed } from '@/components/useAuthed';
import { api } from '@/lib/client';
import { date, price } from '@/lib/format';
import { dict, type Locale } from '@/lib/i18n';

interface Order {
  id: number;
  status: string;
  paymentMethod: string;
  itemsTotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  items: { id: number; title: string; qty: number; price: number }[];
  address: { street: string; zone: { regionUz: string; regionRu: string; daysMin: number; daysMax: number } };
  payments: { state: string }[];
}

export default function OrderPage() {
  const { locale, id } = useParams<{ locale: Locale; id: string }>();
  const t = dict(locale);
  const session = useAuthed();
  const [order, setOrder] = useState<Order>();
  const [error, setError] = useState('');

  const load = useCallback(() => api<Order>(`/orders/${id}`).then(setOrder), [id]);
  useEffect(() => {
    if (session) load();
  }, [session, load]);

  if (!order) return null;
  const paid = order.payments.some((p) => p.state === 'PAID');
  const canCancel = ['NEW', 'CONFIRMED'].includes(order.status);
  const canPay = !paid && order.paymentMethod !== 'CASH' && order.status !== 'CANCELLED';

  const act = async (fn: () => Promise<void>) => {
    setError('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">
          {t.orderNo} · {date(order.createdAt, locale)}
        </h1>
        <StatusBadge status={order.status} label={t.status[order.status]} />
      </div>
      <section className="card divide-y divide-slate-100">
        {order.items.map((i) => (
          <div key={i.id} className="flex justify-between gap-3 px-4 py-3 text-sm">
            <span>
              {i.title} × {i.qty}
            </span>
            <span className="font-medium">{price(i.price * i.qty, t.sum)}</span>
          </div>
        ))}
        <div className="flex justify-between px-4 py-3 text-sm">
          <span>
            {t.delivery}: {locale === 'ru' ? order.address.zone.regionRu : order.address.zone.regionUz}, {order.address.street}
          </span>
          <span>{price(order.deliveryFee, t.sum)}</span>
        </div>
        <div className="flex justify-between px-4 py-3 font-bold">
          <span>{t.total}</span>
          <span>{price(order.total, t.sum)}</span>
        </div>
      </section>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>
          {t.payment}: <b>{order.paymentMethod === 'CASH' ? t.cash : order.paymentMethod}</b> · {paid ? t.paid : t.notPaid}
        </span>
        <div className="ml-auto flex gap-2">
          {canPay && (
            <button
              className="btn"
              onClick={() =>
                act(async () => {
                  const { url } = await api(`/payments/${order.id}/init`, { method: 'POST', body: {} });
                  location.href = url;
                })
              }
            >
              {t.pay}
            </button>
          )}
          {canCancel && (
            <button className="btn-ghost" onClick={() => act(async () => (await api(`/orders/${order.id}/cancel`, { method: 'POST' }), load()))}>
              {t.cancel}
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
