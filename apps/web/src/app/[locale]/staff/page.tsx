'use client';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuthed } from '@/components/useAuthed';
import { api } from '@/lib/client';
import { date, price } from '@/lib/format';
import { dict, type Locale } from '@/lib/i18n';

// Operator paneli: buyurtmalarni qayta ishlash, muddati yaqin partiyalar, omborga kirim.
interface StaffOrder {
  id: number;
  status: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
  comment: string | null;
  user: { phone: string; name: string | null };
  address: { street: string; zone: { regionUz: string } };
  items: { id: number; title: string; qty: number; batch: { batchNo: string; expiryDate: string } }[];
  payments: { state: string }[];
  delivery: { status: string; courier: { user: { name: string | null; phone: string } } } | null;
}

interface Courier {
  id: number;
  status: string;
  user: { name: string | null; phone: string };
  _count: { deliveries: number };
}

interface Batch {
  id: number;
  batchNo: string;
  expiryDate: string;
  qty: number;
  variant: { sku: string; packSize: string; product: { titleUz: string } };
}

const TABS = ['orders', 'expiring', 'receipt'] as const;
const TAB_LABEL = { orders: 'Buyurtmalar', expiring: 'Muddati yaqin', receipt: 'Omborga kirim' };
const STATUSES = ['NEW', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function StaffPage() {
  const { locale } = useParams<{ locale: Locale }>();
  const t = dict(locale);
  const session = useAuthed();
  const [tab, setTab] = useState<(typeof TABS)[number]>('orders');
  const [status, setStatus] = useState('NEW');
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [expiring, setExpiring] = useState<Batch[]>([]);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      if (tab === 'orders') {
        setOrders(await api(`/staff/orders?status=${status}`));
        setCouriers(await api('/staff/couriers'));
      }
      if (tab === 'expiring') setExpiring(await api('/staff/expiring?days=90'));
    } catch (e) {
      setMsg((e as Error).message);
    }
  }, [tab, status]);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  const act = async (path: string, body?: unknown) => {
    setMsg('');
    try {
      await api(path, { method: 'POST', body });
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  if (!session) return null;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">{t.staffPanel}</h1>
      <div className="flex gap-2">
        {TABS.map((k) => (
          <button key={k} className={tab === k ? 'btn' : 'btn-ghost'} onClick={() => setTab(k)}>
            {TAB_LABEL[k]}
          </button>
        ))}
      </div>
      {msg && <p className="text-sm text-red-600">{msg}</p>}

      {tab === 'orders' && (
        <>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => setStatus(s)} className={`rounded-full border px-3 py-1 text-sm ${status === s ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white'}`}>
                {dict('uz').status[s]}
              </button>
            ))}
          </div>
          {orders.length === 0 && <p className="card p-6 text-center text-slate-500">Buyurtma yo‘q</p>}
          {orders.map((o) => (
            <article key={o.id} className="card flex flex-col gap-3 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <b>#{o.id}</b>
                <StatusBadge status={o.status} label={dict('uz').status[o.status]} />
                <span className="text-slate-500">{date(o.createdAt, 'uz')}</span>
                <span>
                  {o.user.name ?? ''} {o.user.phone}
                </span>
                <span className="ml-auto font-semibold">{price(o.total, t.sum)}</span>
              </div>
              <p>
                {o.address.zone.regionUz}, {o.address.street} · {o.paymentMethod} · {o.payments.some((p) => p.state === 'PAID') ? 'to‘langan' : 'to‘lanmagan'}
              </p>
              <table className="w-full text-left">
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
                      <td>{date(i.batch.expiryDate, 'uz')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {o.comment && <p className="rounded-lg bg-slate-50 p-2">{o.comment}</p>}
              {o.delivery && (
                <p className="text-slate-600">
                  Kuryer: {o.delivery.courier.user.name} {o.delivery.courier.user.phone} · {o.delivery.status}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {o.status === 'NEW' && (
                  <button className="btn" onClick={() => act(`/staff/orders/${o.id}/status`, { status: 'CONFIRMED' })}>
                    Tasdiqlash
                  </button>
                )}
                {o.status === 'CONFIRMED' && (
                  <button className="btn" onClick={() => act(`/staff/orders/${o.id}/status`, { status: 'PACKED' })}>
                    Yig‘ildi
                  </button>
                )}
                {o.status === 'PACKED' && !o.delivery && (
                  <select className="input w-auto" defaultValue="" onChange={(e) => e.target.value && act(`/staff/orders/${o.id}/assign-courier`, { courierId: Number(e.target.value) })}>
                    <option value="">Kuryerga biriktirish…</option>
                    {couriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.user.name ?? c.user.phone} ({c._count.deliveries} faol)
                      </option>
                    ))}
                  </select>
                )}
                {['NEW', 'CONFIRMED', 'PACKED'].includes(o.status) && !o.delivery && (
                  <button className="btn-ghost" onClick={() => act(`/staff/orders/${o.id}/cancel`)}>
                    Bekor qilish
                  </button>
                )}
              </div>
            </article>
          ))}
        </>
      )}

      {tab === 'expiring' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2 font-normal">Mahsulot</th>
                <th className="font-normal">SKU</th>
                <th className="font-normal">Partiya</th>
                <th className="font-normal">Muddati</th>
                <th className="font-normal">Qoldiq</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {expiring.map((b) => {
                const expired = new Date(b.expiryDate) <= new Date();
                return (
                  <tr key={b.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      {b.variant.product.titleUz} {b.variant.packSize}
                    </td>
                    <td>{b.variant.sku}</td>
                    <td>{b.batchNo}</td>
                    <td className={expired ? 'font-semibold text-red-600' : 'text-amber-700'}>{date(b.expiryDate, 'uz')}</td>
                    <td>{b.qty}</td>
                    <td className="pr-4 text-right">
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => act(`/staff/batches/${b.id}/write-off`, { qty: b.qty, reason: expired ? 'Muddati o‘tgan' : 'Hisobdan chiqarish' })}
                      >
                        Hisobdan chiqarish
                      </button>
                    </td>
                  </tr>
                );
              })}
              {expiring.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    90 kun ichida muddati tugaydigan partiya yo‘q
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'receipt' && <ReceiptForm onDone={(m) => setMsg(m)} />}
    </div>
  );
}

function ReceiptForm({ onDone }: { onDone: (msg: string) => void }) {
  const [products, setProducts] = useState<{ slug: string; title: string }[]>([]);
  const [variants, setVariants] = useState<{ id: number; sku: string; packSize: string }[]>([]);
  const [form, setForm] = useState({ variantId: 0, batchNo: '', expiryDate: '', qty: 1, purchasePrice: 0 });
  const [ok, setOk] = useState('');

  useEffect(() => {
    api('/products?limit=60').then((r) => setProducts(r.items));
  }, []);

  const pickProduct = async (slug: string) => {
    const p = await api(`/products/${slug}`);
    setVariants(p.variants);
    setForm((f) => ({ ...f, variantId: p.variants[0]?.id ?? 0 }));
  };

  const submit = async () => {
    setOk('');
    try {
      await api('/staff/batches', { method: 'POST', body: form });
      setOk(`Qabul qilindi: ${form.batchNo}, ${form.qty} dona`);
      setForm({ ...form, batchNo: '', qty: 1 });
    } catch (e) {
      onDone((e as Error).message);
    }
  };

  return (
    <div className="card grid max-w-xl gap-3 p-5 text-sm">
      <label className="flex flex-col gap-1">
        Mahsulot
        <select className="input" defaultValue="" onChange={(e) => pickProduct(e.target.value)}>
          <option value="" disabled>
            Tanlang…
          </option>
          {products.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.title}
            </option>
          ))}
        </select>
      </label>
      {variants.length > 0 && (
        <label className="flex flex-col gap-1">
          Qadoq
          <select className="input" value={form.variantId} onChange={(e) => setForm({ ...form, variantId: Number(e.target.value) })}>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.packSize} ({v.sku})
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          Partiya (seriya)
          <input className="input" value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          Yaroqlilik muddati
          <input className="input" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          Soni
          <input className="input" type="number" min={1} value={form.qty} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} />
        </label>
        <label className="flex flex-col gap-1">
          Kirim narxi (so‘m)
          <input className="input" type="number" min={0} value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })} />
        </label>
      </div>
      {ok && <p className="text-brand-700">{ok}</p>}
      <button className="btn" disabled={!form.variantId || !form.batchNo || !form.expiryDate} onClick={submit}>
        Qabul qilish
      </button>
    </div>
  );
}
