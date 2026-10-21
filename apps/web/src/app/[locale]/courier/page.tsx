'use client';
import { Banknote, CheckCircle2, Loader2, MapPin, MessageSquare, Navigation, Package, Phone, RefreshCw, Send, User } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { price } from '@/lib/format';
import type { Locale } from '@/lib/i18n';

// Kuryer: qayerga, kimga, qaysi manzilga olib borish kerak + qabul qiluvchining telefoni.
interface Delivery {
  id: number;
  status: 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT';
  codAmount: number;
  order: {
    id: number;
    total: number;
    comment: string | null;
    user: { phone: string; name: string | null; telegramUsername: string | null };
    address: { street: string; landmark: string | null; lat: number | null; lng: number | null; zone: { regionUz: string; regionRu: string } };
    items: { title: string; qty: number }[];
  };
}

const L = {
  uz: {
    title: 'Mening yetkazishlarim', none: 'Hozircha biriktirilgan buyurtma yo‘q', recipient: 'Qabul qiluvchi', address: 'Manzil', landmark: 'Mo‘ljal',
    items: 'Tovarlar', call: 'Qo‘ng‘iroq', telegram: 'Telegram', map: 'Xaritada', cash: 'Naqd olinadi', paid: 'To‘langan, pul olinmaydi', comment: 'Izoh',
    ASSIGNED: 'Omborda olish kerak', PICKED_UP: 'Qo‘lingizda', IN_TRANSIT: 'Yo‘lda',
    pickup: 'Omborda oldim', go: 'Yo‘lga chiqdim', done: 'Topshirdim', ret: 'Qaytardim', confirmDone: 'Buyurtma topshirildi va pul olindimi?', confirmRet: 'Buyurtma qaytarilsinmi?',
    shiftOn: 'Ishdaman', shiftOff: 'Ishda emasman', pcs: 'dona', refresh: 'Yangilash',
  },
  ru: {
    title: 'Мои доставки', none: 'Пока нет назначенных заказов', recipient: 'Получатель', address: 'Адрес', landmark: 'Ориентир',
    items: 'Товары', call: 'Позвонить', telegram: 'Telegram', map: 'На карте', cash: 'Получить наличными', paid: 'Оплачен, деньги не брать', comment: 'Комментарий',
    ASSIGNED: 'Забрать со склада', PICKED_UP: 'У вас', IN_TRANSIT: 'В пути',
    pickup: 'Забрал со склада', go: 'Выехал', done: 'Доставил', ret: 'Возврат', confirmDone: 'Заказ передан и деньги получены?', confirmRet: 'Оформить возврат заказа?',
    shiftOn: 'На смене', shiftOff: 'Не на смене', pcs: 'шт.', refresh: 'Обновить',
  },
};

const BADGE = { ASSIGNED: 'bg-amber-100 text-amber-800', PICKED_UP: 'bg-sky-100 text-sky-800', IN_TRANSIT: 'bg-brand-100 text-brand-800' };

export default function CourierPage() {
  const { locale } = useParams<{ locale: Locale }>();
  const t = L[locale] ?? L.uz;
  const [list, setList] = useState<Delivery[]>();
  const [shift, setShift] = useState<'ACTIVE' | 'OFFLINE' | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Ro'yxat va smena holati birga yangilanadi; xato bo'lsa ko'rsatiladi va "Yangilash" bilan qayta uriniladi.
  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [deliveries, me] = await Promise.all([api<Delivery[]>('/courier/deliveries'), api<{ status: 'ACTIVE' | 'BUSY' | 'OFFLINE' }>('/courier/me')]);
      setList(deliveries);
      setShift(me.status === 'OFFLINE' ? 'OFFLINE' : 'ACTIVE');
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const update = async (d: Delivery, status: string) => {
    if (status === 'DELIVERED' && !confirm(t.confirmDone)) return;
    if (status === 'RETURNED' && !confirm(t.confirmRet)) return;
    setError('');
    try {
      await api(`/courier/deliveries/${d.id}/status`, {
        method: 'POST',
        body: { status, cashTaken: status === 'DELIVERED' && d.codAmount > 0 ? d.codAmount : undefined },
      });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const setShiftStatus = async (s: 'ACTIVE' | 'OFFLINE') => {
    if (s === shift) return;
    const prev = shift;
    setShift(s);
    setError('');
    try {
      await api('/courier/status', { method: 'POST', body: { status: s } });
    } catch (e) {
      setShift(prev);
      setError((e as Error).message);
    }
  };

  const refresh = (
    <button className="btn-soft py-2" onClick={load} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      {t.refresh}
    </button>
  );

  if (!list) {
    return (
      <div className="flex flex-col items-center gap-3 p-10">
        {error ? <p className="w-full rounded-lg bg-red-50 p-3 text-center text-red-700">{error}</p> : <Loader2 className="h-6 w-6 animate-spin text-slate-400" />}
        {error && refresh}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h1 className="flex-1 text-lg font-bold">
          {t.title} <span className="text-slate-400">{list.length}</span>
        </h1>
        <button className="rounded-lg bg-white p-2 text-slate-600 shadow-sm disabled:opacity-50" onClick={load} disabled={busy} aria-label={t.refresh}>
          <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
        </button>
        <div className="flex rounded-lg bg-white p-0.5 text-xs font-semibold shadow-sm">
          {(['ACTIVE', 'OFFLINE'] as const).map((s) => (
            <button key={s} onClick={() => setShiftStatus(s)} className={`rounded-md px-2.5 py-1.5 ${shift === s ? (s === 'ACTIVE' ? 'bg-brand-600 text-white' : 'bg-slate-700 text-white') : 'text-slate-600'}`}>
              {s === 'ACTIVE' ? t.shiftOn : t.shiftOff}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {list.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-10 text-center text-slate-500">
          <CheckCircle2 className="h-10 w-10 text-brand-500" />
          {t.none}
          <div className="mt-2">{refresh}</div>
        </div>
      )}

      {list.map((d) => {
        const a = d.order.address;
        const region = locale === 'ru' ? a.zone.regionRu : a.zone.regionUz;
        const mapUrl = a.lat && a.lng ? `https://yandex.uz/maps/?pt=${a.lng},${a.lat}&z=17` : `https://yandex.uz/maps/?text=${encodeURIComponent(`${region}, ${a.street}`)}`;
        return (
          <article key={d.id} className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <span className="font-bold">#{d.order.id}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE[d.status]}`}>{t[d.status]}</span>
            </div>

            <div className="flex flex-col gap-4 p-4">
              {/* Kimga */}
              <section>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
                  <User className="h-3.5 w-3.5" /> {t.recipient}
                </p>
                <p className="text-lg font-bold">{d.order.user.name ?? '—'}</p>
                <a href={`tel:${d.order.user.phone}`} className="text-xl font-semibold tracking-wide text-brand-700">
                  {d.order.user.phone}
                </a>
                <div className={`mt-2 grid gap-2 ${d.order.user.telegramUsername ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <a href={`tel:${d.order.user.phone}`} className="btn py-3">
                    <Phone className="h-4 w-4" /> {t.call}
                  </a>
                  {d.order.user.telegramUsername && (
                    <a href={`https://t.me/${d.order.user.telegramUsername}`} target="_blank" rel="noopener" className="btn bg-[#229ED9] py-3 hover:bg-[#1c8cc2]">
                      <Send className="h-4 w-4" /> {t.telegram}
                    </a>
                  )}
                </div>
              </section>

              {/* Qayerga */}
              <section>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
                  <MapPin className="h-3.5 w-3.5" /> {t.address}
                </p>
                <p className="font-semibold">{region}</p>
                <p className="text-base">{a.street}</p>
                {a.landmark && (
                  <p className="text-slate-600">
                    {t.landmark}: {a.landmark}
                  </p>
                )}
                <a href={mapUrl} target="_blank" rel="noopener" className="btn-soft mt-2 w-full py-2.5">
                  <Navigation className="h-4 w-4" /> {t.map}
                </a>
              </section>

              {/* Nima */}
              <section>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
                  <Package className="h-3.5 w-3.5" /> {t.items}
                </p>
                <ul className="flex flex-col gap-0.5 text-sm">
                  {d.order.items.map((i, n) => (
                    <li key={n} className="flex justify-between gap-3">
                      <span>{i.title}</span>
                      <span className="whitespace-nowrap font-semibold">
                        {i.qty} {t.pcs}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {d.order.comment && (
                <p className="flex gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  {d.order.comment}
                </p>
              )}

              {d.codAmount > 0 ? (
                <p className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-amber-900">
                  <Banknote className="h-5 w-5" />
                  {t.cash}: <b className="text-lg">{price(d.codAmount, 'so‘m')}</b>
                </p>
              ) : (
                <p className="flex items-center gap-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
                  <CheckCircle2 className="h-4 w-4" /> {t.paid}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                {d.status === 'ASSIGNED' && (
                  <button className="btn col-span-2 py-3 text-base" onClick={() => update(d, 'PICKED_UP')}>
                    {t.pickup}
                  </button>
                )}
                {d.status === 'PICKED_UP' && (
                  <button className="btn-ghost col-span-2 py-3" onClick={() => update(d, 'IN_TRANSIT')}>
                    {t.go}
                  </button>
                )}
                {d.status !== 'ASSIGNED' && (
                  <>
                    <button className="btn py-3 text-base" onClick={() => update(d, 'DELIVERED')}>
                      {t.done}
                    </button>
                    <button className="btn-ghost py-3" onClick={() => update(d, 'RETURNED')}>
                      {t.ret}
                    </button>
                  </>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
