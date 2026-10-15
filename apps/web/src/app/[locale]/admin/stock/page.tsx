'use client';
import { useCallback, useEffect, useState } from 'react';
import type { AdminProduct } from '@/components/admin/types';
import { api } from '@/lib/client';
import { date } from '@/lib/format';

// Ombor: muddati yaqin partiyalar (hisobdan chiqarish) va yangi partiyani qabul qilish.
interface Batch {
  id: number;
  batchNo: string;
  expiryDate: string;
  qty: number;
  variant: { sku: string; packSize: string; product: { titleUz: string } };
}

export default function AdminStockPage() {
  const [days, setDays] = useState(90);
  const [expiring, setExpiring] = useState<Batch[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => api<Batch[]>(`/staff/expiring?days=${days}`).then(setExpiring), [days]);
  useEffect(() => {
    load();
  }, [load]);

  const writeOff = async (b: Batch) => {
    const expired = new Date(b.expiryDate) <= new Date();
    if (!confirm(`${b.variant.product.titleUz} (${b.batchNo}) — ${b.qty} dona hisobdan chiqarilsinmi?`)) return;
    try {
      await api(`/staff/batches/${b.id}/write-off`, { method: 'POST', body: { qty: b.qty, reason: expired ? 'Muddati o‘tgan' : 'Hisobdan chiqarish' } });
      setMsg({ ok: true, text: `${b.batchNo} hisobdan chiqarildi` });
      load();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold">Ombor</h1>
      {msg && <p className={`rounded-md p-3 ${msg.ok ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}

      <ReceiptForm onDone={(text) => (setMsg({ ok: true, text }), load())} onError={(text) => setMsg({ ok: false, text })} />

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">Muddati yaqin partiyalar</h2>
          <select className="input w-auto py-1.5" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[30, 60, 90, 180].map((d) => (
              <option key={d} value={d}>
                {d} kun ichida
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-left">
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
                      {b.variant.product.titleUz} <span className="text-slate-500">{b.variant.packSize}</span>
                    </td>
                    <td>{b.variant.sku}</td>
                    <td>{b.batchNo}</td>
                    <td className={expired ? 'font-semibold text-red-600' : 'text-amber-700'}>{date(b.expiryDate)}</td>
                    <td>{b.qty}</td>
                    <td className="pr-4 text-right">
                      <button className="text-red-600 hover:underline" onClick={() => writeOff(b)}>
                        Hisobdan chiqarish
                      </button>
                    </td>
                  </tr>
                );
              })}
              {expiring.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    {days} kun ichida muddati tugaydigan partiya yo‘q
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ReceiptForm({ onDone, onError }: { onDone: (msg: string) => void; onError: (msg: string) => void }) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [productId, setProductId] = useState(0);
  const empty = { variantId: 0, batchNo: '', expiryDate: '', qty: 1, purchasePrice: 0 };
  const [form, setForm] = useState(empty);

  useEffect(() => {
    api<AdminProduct[]>('/admin/products').then(setProducts);
  }, []);

  const variants = products.find((p) => p.id === productId)?.variants ?? [];

  const submit = async () => {
    try {
      await api('/staff/batches', { method: 'POST', body: form });
      onDone(`Qabul qilindi: ${form.batchNo}, ${form.qty} dona`);
      setForm({ ...form, batchNo: '', qty: 1 });
    } catch (e) {
      onError((e as Error).message);
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">Omborga kirim (yangi partiya)</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 lg:col-span-2">
          Mahsulot
          <select
            className="input py-2"
            value={productId || ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              setProductId(id);
              setForm({ ...form, variantId: products.find((p) => p.id === id)?.variants[0]?.id ?? 0 });
            }}
          >
            <option value="" disabled>
              Tanlang…
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.titleUz}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Qadoq
          <select className="input py-2" value={form.variantId || ''} disabled={!variants.length} onChange={(e) => setForm({ ...form, variantId: Number(e.target.value) })}>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.packSize} ({v.sku})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Partiya (seriya)
          <input className="input py-2" value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          Yaroqlilik muddati
          <input className="input py-2" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          Soni
          <input className="input py-2" type="number" min={1} value={form.qty} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} />
        </label>
        <label className="flex flex-col gap-1">
          Kirim narxi (so‘m)
          <input className="input py-2" type="number" min={0} value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })} />
        </label>
      </div>
      <button className="btn self-start py-2" disabled={!form.variantId || !form.batchNo || !form.expiryDate || form.qty < 1} onClick={submit}>
        Qabul qilish
      </button>
    </section>
  );
}
