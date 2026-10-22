'use client';
import { RefreshCw, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthed } from '@/components/useAuthed';
import { api } from '@/lib/client';
import { price } from '@/lib/format';
import { dict, type Locale } from '@/lib/i18n';
import { refreshShop } from '@/lib/shop';

interface Zone {
  id: number;
  region: string;
  fee: number;
  daysMin: number;
  daysMax: number;
}

interface Cart {
  items: { variantId: number; qty: number; price: number; packSize: string; title: string }[];
  itemsTotal: number;
}

export default function CheckoutPage() {
  const { locale } = useParams<{ locale: Locale }>();
  const t = dict(locale);
  const router = useRouter();
  const session = useAuthed();
  const [zones, setZones] = useState<Zone[]>([]);
  const [cart, setCart] = useState<Cart>();
  const [methods, setMethods] = useState<string[]>(['CASH']);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState({ zoneId: 0, street: '', landmark: '', paymentMethod: 'CASH', comment: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Savat va hududlar birga yuklanadi. Xato bo'lsa (server uyg'onyapti) jim qolmaydi: qayta urinish tugmasi chiqadi.
  const load = useCallback(() => {
    setLoadError(false);
    Promise.all([api<Zone[]>('/delivery-zones', { locale }), api<Cart>('/cart', { locale }), api<string[]>('/payments/methods')])
      .then(([z, c, m]) => {
        setMethods(m);
        setZones(z);
        setForm((f) => ({ ...f, zoneId: f.zoneId || z[0]?.id || 0 }));
        setCart(c);
      })
      .catch(() => setLoadError(true));
  }, [locale]);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  const zone = useMemo(() => zones.find((z) => z.id === form.zoneId), [zones, form.zoneId]);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: k === 'zoneId' ? Number(e.target.value) : e.target.value });

  const submit = async () => {
    // Tugma o'chirilmaydi: nima yetishmayotgani matn bilan aytiladi.
    if (!form.street.trim()) return setError(t.enterAddress);
    setBusy(true);
    setError('');
    try {
      const address = await api('/addresses', {
        method: 'POST',
        body: { zoneId: form.zoneId, street: form.street, landmark: form.landmark || undefined },
      });
      const order = await api('/orders', {
        method: 'POST',
        body: { addressId: address.id, paymentMethod: form.paymentMethod, comment: form.comment || undefined },
      });
      refreshShop();
      // Buyurtma yaratildi, savat bo'shadi: to'lov boshlanmasa ham xaridor buyurtma sahifasiga o'tadi (u yerda qayta to'lash mumkin).
      if (form.paymentMethod !== 'CASH') {
        try {
          const { url } = await api(`/payments/${order.id}/init`, { method: 'POST', body: {} });
          location.href = url;
          return;
        } catch {}
      }
      router.push(`/${locale}/orders/${order.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  if (!session) return null;
  if (loadError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl bg-surface p-10 text-center">
        <p className="text-slate-600">{t.loadError}</p>
        <button className="btn-soft" onClick={load}>
          <RefreshCw className="h-4 w-4" /> {t.retry}
        </button>
      </div>
    );
  }
  if (!cart) return null;
  // Buyurtma berilgandan keyin "orqaga" bosilsa yoki boshqa tabda savat bo'shatilsa.
  if (!cart.items.length) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl bg-surface p-12 text-center">
        <ShoppingBag className="h-12 w-12 text-brand-600" />
        <p className="text-slate-600">{t.cartEmpty}</p>
        <Link href={`/${locale}/catalog`} className="btn">
          {t.catalog}
        </Link>
      </div>
    );
  }
  const itemsTotal = cart.itemsTotal;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="card flex flex-col gap-4 p-5">
        <h1 className="text-xl font-bold">{t.checkout}</h1>
        <label className="flex flex-col gap-1 text-sm">
          {t.region}
          <select className="input" value={form.zoneId} onChange={set('zoneId')}>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.region} — {price(z.fee, t.sum)}, {z.daysMin}–{z.daysMax} {t.days}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t.street}
          <input className="input" value={form.street} onChange={(e) => (setError(''), set('street')(e))} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t.landmark}
          <input className="input" value={form.landmark} onChange={set('landmark')} />
        </label>
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1">{t.payment}</legend>
          {[
            ['CASH', t.cash],
            ['PAYME', 'Payme'],
            ['CLICK', 'Click'],
          ]
            .filter(([value]) => methods.includes(value))
            .map(([value, label]) => (
            <label key={value} className={`card flex cursor-pointer items-center gap-3 p-3 ${form.paymentMethod === value ? 'border-brand-600' : ''}`}>
              <input type="radio" name="pm" value={value} checked={form.paymentMethod === value} onChange={set('paymentMethod')} />
              {label}
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-1 text-sm">
          {t.comment}
          <textarea className="input" rows={2} value={form.comment} onChange={set('comment')} />
        </label>
      </section>
      <aside className="card h-fit p-5 text-sm">
        <ul className="mb-3 flex flex-col gap-1.5 border-b border-slate-100 pb-3 text-slate-600">
          {cart.items.map((i) => (
            <li key={i.variantId} className="flex gap-2">
              <span className="min-w-0 flex-1 truncate">
                {i.title} {i.packSize} × {i.qty}
              </span>
              <span className="whitespace-nowrap">{price(i.price * i.qty, t.sum)}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between py-1">
          <span>{t.itemsTotal}</span>
          <span>{price(itemsTotal, t.sum)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span>{t.delivery}</span>
          <span>{price(zone?.fee ?? 0, t.sum)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-slate-100 pt-3 text-lg font-bold">
          <span>{t.total}</span>
          <span>{price(itemsTotal + (zone?.fee ?? 0), t.sum)}</span>
        </div>
        {error && <p className="mt-3 text-red-600">{error}</p>}
        <button className="btn mt-4 w-full" disabled={busy} onClick={submit}>
          {t.placeOrder}
        </button>
      </aside>
    </div>
  );
}
