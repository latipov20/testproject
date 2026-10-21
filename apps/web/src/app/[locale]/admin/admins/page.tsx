'use client';
import { useCallback, useEffect, useState } from 'react';
import { PasswordInput } from '@/components/PasswordInput';
import { api, getSession } from '@/lib/client';
import { date } from '@/lib/format';

// Adminlar (faqat superadmin): login/parol bilan yangi admin qo'shish va chiqarish.
interface Admin {
  id: number;
  login: string;
  name: string | null;
  phone: string;
  superAdmin: boolean;
  createdAt: string;
}

const EMPTY = { login: '', password: '', name: '', phone: '+998' };

export default function AdminAdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const isSuper = getSession()?.superAdmin;

  const load = useCallback(async () => {
    try {
      setAdmins(await api<Admin[]>('/admin/admins'));
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  }, []);
  useEffect(() => {
    if (isSuper) load();
  }, [isSuper, load]);

  const create = async () => {
    setMsg(null);
    try {
      await api('/admin/admins', { method: 'POST', body: { ...form, login: form.login.trim().toLowerCase(), phone: form.phone.replace(/\s/g, '') } });
      setMsg({ ok: true, text: `${form.login} admin qilib qo‘shildi` });
      setForm(EMPTY);
      load();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  };

  const remove = async (a: Admin) => {
    if (!confirm(`${a.login} adminlikdan chiqarilsinmi? U panelga kira olmaydi.`)) return;
    try {
      await api(`/admin/admins/${a.id}`, { method: 'DELETE' });
      setMsg({ ok: true, text: `${a.login} adminlikdan chiqarildi` });
      load();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  };

  if (!isSuper) return <p className="rounded-md bg-white p-6 text-center text-slate-500">Bu bo‘lim faqat superadmin uchun</p>;

  const valid = /^[a-z0-9._-]{3,32}$/.test(form.login.trim().toLowerCase()) && form.password.length >= 8 && form.name.trim() && /^\+998\d{9}$/.test(form.phone.replace(/\s/g, ''));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Adminlar</h1>
      {msg && <p className={`rounded-md p-3 ${msg.ok ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}

      <section className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4">
        <div>
          <h2 className="font-semibold">Yangi admin</h2>
          <p className="text-slate-500">Admin panelga shu login va parol bilan kiradi. Parolni unga o‘zingiz yetkazing.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1">
            Login
            <input className="input py-2" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} autoCapitalize="none" autoComplete="off" />
          </label>
          <label className="flex flex-col gap-1">
            Parol (kamida 8 belgi)
            <PasswordInput className="input py-2" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
          </label>
          <label className="flex flex-col gap-1">
            Ismi
            <input className="input py-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            Telefon
            <input className="input py-2" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" />
          </label>
        </div>
        <button className="btn self-start py-2" disabled={!valid} onClick={create}>
          Qo‘shish
        </button>
      </section>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-left">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2 font-normal">Login</th>
              <th className="font-normal">Ismi</th>
              <th className="font-normal">Telefon</th>
              <th className="font-normal">Qo‘shilgan</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium">
                  {a.login}
                  {a.superAdmin && <span className="ml-2 rounded bg-slate-900 px-1.5 py-0.5 text-xs font-normal text-white">superadmin</span>}
                </td>
                <td>{a.name ?? '—'}</td>
                <td>{a.phone}</td>
                <td>{date(a.createdAt)}</td>
                <td className="pr-4 text-right">
                  {!a.superAdmin && (
                    <button className="text-red-600 hover:underline" onClick={() => remove(a)}>
                      Chiqarish
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
