'use client';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuthed } from '@/components/useAuthed';
import { api } from '@/lib/client';
import { price } from '@/lib/format';
import { dict, type Locale } from '@/lib/i18n';

// Kuryer ilovasi (mobil veb): biriktirilgan buyurtmalar va holatni yangilash.
interface Delivery {
  id: number;
  status: 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT';
  codAmount: number;
  order: {
    id: number;
    comment: string | null;
    user: { phone: string; name: string | null };
    address: { street: string; landmark: string | null; lat: number | null; lng: number | null; zone: { regionUz: string } };
    items: { title: string; qty: number }[];
  };
}

const LABELS = {
  uz: { ASSIGNED: 'Biriktirildi', PICKED_UP: 'Olindi', IN_TRANSIT: "Yo'lda", pickup: 'Omborda oldim', go: "Yo'lga chiqdim", done: 'Topshirildi', ret: 'Qaytarildi', cash: 'Naqd olish kerak', none: "Hozircha buyurtma yo'q", map: 'Xaritada' },
  ru: { ASSIGNED: 'Назначен', PICKED_UP: 'Забран', IN_TRANSIT: 'В пути', pickup: 'Забрал со склада', go: 'Выехал', done: 'Доставлен', ret: 'Возврат', cash: 'Получить наличными', none: 'Пока нет заказов', map: 'На карте' },
};

export default function CourierPage() {
  const { locale } = useParams<{ locale: Locale }>();
  const t = dict(locale);
  const L = LABELS[locale];
  const session = useAuthed();
  const [list, setList] = useState<Delivery[]>();
  const [error, setError] = useState('');

  const load = useCallback(() => api<Delivery[]>('/courier/deliveries').then(setList).catch((e) => setError(e.message)), []);
  useEffect(() => {
    if (session) load();
  }, [session, load]);

  const update = async (d: Delivery, status: string) => {
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

  if (!list) return error ? <p className="text-red-600">{error}</p> : null;
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-3">
      <h1 className="text-xl font-bold">{t.courierPanel}</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {list.length === 0 && <p className="card p-8 text-center text-slate-500">{L.none}</p>}
      {list.map((d) => (
        <article key={d.id} className="card flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold">#{d.order.id}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{L[d.status]}</span>
          </div>
          <div className="text-sm">
            <p className="font-medium">
              {d.order.address.zone.regionUz}, {d.order.address.street}
            </p>
            {d.order.address.landmark && <p className="text-slate-500">{d.order.address.landmark}</p>}
            <a href={`tel:${d.order.user.phone}`} className="text-brand-700">
              {d.order.user.name ?? ''} {d.order.user.phone}
            </a>
            {d.order.address.lat && (
              <a className="ml-3 text-brand-700" href={`https://yandex.uz/maps/?pt=${d.order.address.lng},${d.order.address.lat}&z=16`} target="_blank">
                {L.map}
              </a>
            )}
          </div>
          <ul className="text-sm text-slate-600">
            {d.order.items.map((i, n) => (
              <li key={n}>
                {i.title} × {i.qty}
              </li>
            ))}
          </ul>
          {d.order.comment && <p className="rounded-lg bg-slate-50 p-2 text-sm">{d.order.comment}</p>}
          {d.codAmount > 0 && (
            <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">
              {L.cash}: <b>{price(d.codAmount, t.sum)}</b>
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {d.status === 'ASSIGNED' && (
              <button className="btn col-span-2" onClick={() => update(d, 'PICKED_UP')}>
                {L.pickup}
              </button>
            )}
            {d.status === 'PICKED_UP' && (
              <button className="btn-ghost col-span-2" onClick={() => update(d, 'IN_TRANSIT')}>
                {L.go}
              </button>
            )}
            {d.status !== 'ASSIGNED' && (
              <>
                <button className="btn" onClick={() => update(d, 'DELIVERED')}>
                  {L.done}
                </button>
                <button className="btn-ghost" onClick={() => update(d, 'RETURNED')}>
                  {L.ret}
                </button>
              </>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
