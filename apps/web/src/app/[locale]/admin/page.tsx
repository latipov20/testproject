'use client';
import { useCallback, useEffect, useState } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/client';
import { date, price } from '@/lib/format';
import { dict } from '@/lib/i18n';

// Buyurtmalar: tasdiqlash, yig'ish, kuryerga biriktirish, bekor qilish.
interface Order {
  id: number;
  status: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
  comment: string | null;
  user: { phone: string; name: string | null; telegramUsername: string | null };
  address: { street: string; landmark: string | null; zone: { regionUz: string } };
  items: { id: number; title: string; qty: number; price: number; batch: { batchNo: string; expiryDate: string } }[];
  payments: { state: string }[];
  delivery: { status: string; courier: { user: { name: string | null; phone: string } } } | null;
}

interface Courier {
  id: number;
  status: string;
  user: { name: string | null; phone: string };
  zone: { regionUz: string } | null;
  _count: { deliveries: number };
}

const STATUSES = ['NEW', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const LABEL = dict('uz').status;
const DELIVERY: Record<string, string> = { ASSIGNED: 'biriktirilgan', PICKED_UP: 'olib ketdi', IN_TRANSIT: 'yo‘lda', DELIVERED: 'topshirdi', RETURNED: 'qaytardi' };

export default function AdminOrdersPage() {
  const [status, setStatus] = useState('NEW');
  const [orders, setOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const [o, c] = await Promise.all([api<Order[]>(`/staff/orders?status=${status}`), api<Courier[]>('/staff/couriers')]);
      setOrders(o);
      setCouriers(c);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (path: string, body?: unknown) => {
    setMsg('');
    try {
      await api(path, { method: 'POST', body });
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Buyurtmalar</h1>
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-md border px-3 py-1.5 ${status === s ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white hover:bg-slate-50'}`}
          >
            {LABEL[s]}
          </button>
        ))}
      </div>
      {msg && <p className="rounded-md bg-red-50 p-3 text-red-700">{msg}</p>}
      {orders.length === 0 && <p className="rounded-md bg-white p-6 text-center text-slate-500">Bu holatda buyurtma yo‘q</p>}

      {orders.map((o) => (
        <article key={o.id} className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <b>#{o.id}</b>
            <StatusBadge status={o.status} label={LABEL[o.status]} />
            <span className="text-slate-500">{date(o.createdAt)}</span>
            <span className="ml-auto font-semibold">{price(o.total, 'so‘m')}</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-slate-400">Qabul qiluvchi</p>
              <p className="font-medium">{o.user.name ?? '—'}</p>
              <a href={`tel:${o.user.phone}`} className="text-brand-700">
                {o.user.phone}
              </a>
              {o.user.telegramUsername && <span className="ml-2 text-slate-500">@{o.user.telegramUsername}</span>}
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Manzil</p>
              <p>
                {o.address.zone.regionUz}, {o.address.street}
              </p>
              {o.address.landmark && <p className="text-slate-500">Mo‘ljal: {o.address.landmark}</p>}
              <p className="text-slate-500">
                {o.paymentMethod} · {o.payments.some((p) => p.state === 'PAID') ? 'to‘langan' : 'to‘lanmagan'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="py-1 font-normal">Mahsulot</th>
                  <th className="font-normal">Soni</th>
                  <th className="font-normal">Partiya</th>
                  <th className="font-normal">Muddati</th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((i) => (
                  <tr key={i.id} className="border-t border-slate-100">
                    <td className="py-1.5">{i.title}</td>
                    <td>{i.qty}</td>
                    <td>{i.batch.batchNo}</td>
                    <td>{date(i.batch.expiryDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {o.comment && <p className="rounded-md bg-amber-50 p-2">Izoh: {o.comment}</p>}
          {o.delivery && (
            <p className="text-slate-600">
              Kuryer: {o.delivery.courier.user.name} {o.delivery.courier.user.phone} · {DELIVERY[o.delivery.status] ?? o.delivery.status}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {o.status === 'NEW' && (
              <button className="btn py-2" onClick={() => act(`/staff/orders/${o.id}/status`, { status: 'CONFIRMED' })}>
                Tasdiqlash
              </button>
            )}
            {o.status === 'CONFIRMED' && (
              <button className="btn py-2" onClick={() => act(`/staff/orders/${o.id}/status`, { status: 'PACKED' })}>
                Yig‘ildi
              </button>
            )}
            {o.status === 'PACKED' && !o.delivery && (
              <select className="input w-auto py-2" defaultValue="" onChange={(e) => e.target.value && act(`/staff/orders/${o.id}/assign-courier`, { courierId: Number(e.target.value) })}>
                <option value="">Kuryerga biriktirish…</option>
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.user.name ?? c.user.phone} · {c.zone?.regionUz ?? 'hudud yo‘q'} · {c._count.deliveries} faol
                  </option>
                ))}
              </select>
            )}
            {['NEW', 'CONFIRMED', 'PACKED'].includes(o.status) && !o.delivery && (
              <button className="btn-ghost py-2" onClick={() => act(`/staff/orders/${o.id}/cancel`)}>
                Bekor qilish
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
