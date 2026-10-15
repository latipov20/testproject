'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';

// Kuryerlar: telefon raqami bo'yicha qo'shish (kuryer shu raqam bilan Telegram orqali kiradi), hudud, chiqarish.
interface Courier {
  id: number;
  status: 'ACTIVE' | 'BUSY' | 'OFFLINE';
  vehicleType: string;
  user: { id: number; phone: string; name: string | null; telegramUsername: string | null };
  zone: { id: number; regionUz: string } | null;
  _count: { deliveries: number };
}
interface Zone {
  id: number;
  regionUz: string;
}

const STATUS = { ACTIVE: 'Ishda', BUSY: 'Band', OFFLINE: 'Ishda emas' };
const EMPTY = { phone: '+998', name: '', zoneId: 0, vehicleType: 'avto' };

export default function AdminCouriersPage() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const [c, z] = await Promise.all([api<Courier[]>('/staff/couriers'), api<Zone[]>('/admin/zones')]);
    setCouriers(c);
    setZones(z);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const save = async (body: typeof form, text: string) => {
    setMsg(null);
    try {
      await api('/admin/couriers', { method: 'POST', body: { ...body, phone: body.phone.replace(/\s/g, ''), zoneId: body.zoneId || undefined } });
      setMsg({ ok: true, text });
      load();
      return true;
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
      return false;
    }
  };

  const dismiss = async (c: Courier) => {
    if (!confirm(`${c.user.name ?? c.user.phone} kuryerlikdan chiqarilsinmi? U oddiy xaridor bo‘lib qoladi.`)) return;
    try {
      await api(`/admin/users/${c.user.id}/role`, { method: 'PATCH', body: { role: 'CUSTOMER' } });
      setMsg({ ok: true, text: `${c.user.phone} kuryerlikdan chiqarildi` });
      load();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Kuryerlar</h1>
      {msg && <p className={`rounded-md p-3 ${msg.ok ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}

      <section className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4">
        <div>
          <h2 className="font-semibold">Yangi kuryer</h2>
          <p className="text-slate-500">Kuryer shu raqam bilan /courier sahifasida Telegram orqali kiradi.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1">
            Telefon
            <input className="input py-2" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" />
          </label>
          <label className="flex flex-col gap-1">
            Ismi
            <input className="input py-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            Hudud
            <select className="input py-2" value={form.zoneId || ''} onChange={(e) => setForm({ ...form, zoneId: Number(e.target.value) })}>
              <option value="">Tanlanmagan</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.regionUz}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Transport
            <select className="input py-2" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
              <option value="avto">Avtomobil</option>
              <option value="moto">Mototsikl</option>
              <option value="piyoda">Piyoda</option>
            </select>
          </label>
        </div>
        <button
          className="btn self-start py-2"
          disabled={!/^\+998\d{9}$/.test(form.phone.replace(/\s/g, '')) || !form.name.trim()}
          onClick={async () => (await save(form, `${form.name} kuryer qilib qo‘shildi`)) && setForm(EMPTY)}
        >
          Qo‘shish
        </button>
      </section>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2 font-normal">Kuryer</th>
              <th className="font-normal">Telefon</th>
              <th className="font-normal">Hudud</th>
              <th className="font-normal">Holati</th>
              <th className="font-normal">Faol yetkazishlar</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {couriers.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <div className="font-medium">{c.user.name ?? '—'}</div>
                  <div className="text-xs text-slate-500">{c.user.telegramUsername ? `@${c.user.telegramUsername}` : 'Telegram orqali hali kirmagan'}</div>
                </td>
                <td>
                  <a href={`tel:${c.user.phone}`} className="text-brand-700">
                    {c.user.phone}
                  </a>
                </td>
                <td>
                  <select
                    className="rounded border border-slate-200 px-2 py-1"
                    value={c.zone?.id ?? ''}
                    onChange={(e) =>
                      save({ phone: c.user.phone, name: c.user.name ?? c.user.phone, zoneId: Number(e.target.value), vehicleType: c.vehicleType }, 'Hudud saqlandi')
                    }
                  >
                    <option value="">—</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.regionUz}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{STATUS[c.status]}</td>
                <td>{c._count.deliveries}</td>
                <td className="pr-4 text-right">
                  <button className="text-red-600 hover:underline" onClick={() => dismiss(c)}>
                    Chiqarish
                  </button>
                </td>
              </tr>
            ))}
            {couriers.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  Kuryer yo‘q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
