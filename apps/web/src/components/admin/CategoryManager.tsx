'use client';
import { useState } from 'react';
import { api } from '@/lib/client';
import { AdminCategory, slugify } from './types';

interface Form {
  parentId: number | null;
  nameUz: string;
  nameRu: string;
  slug: string;
  position: number;
}

const EMPTY: Form = { parentId: null, nameUz: '', nameRu: '', slug: '', position: 0 };

// Kategoriyalar ikki darajali: asosiy kategoriya va uning subkategoriyalari.
export function CategoryManager({ categories, onChanged }: { categories: AdminCategory[]; onChanged: (msg: string) => void }) {
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [f, setF] = useState<Form>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const parents = categories.filter((c) => c.parentId === null);

  const startNew = (parentId: number | null = null) => {
    setEditing(null);
    setSlugTouched(false);
    setError('');
    setF({ ...EMPTY, parentId, position: categories.filter((c) => c.parentId === parentId).length });
  };

  const startEdit = (c: AdminCategory) => {
    setEditing(c);
    setSlugTouched(true);
    setError('');
    setF({ parentId: c.parentId, nameUz: c.nameUz, nameRu: c.nameRu, slug: c.slug, position: c.position });
  };

  const save = async () => {
    setError('');
    if (!f.nameUz.trim() || !f.nameRu.trim() || !f.slug) return setError('Ikkala tildagi nom va slug majburiy');
    setBusy(true);
    try {
      if (editing) await api(`/admin/categories/${editing.id}`, { method: 'PATCH', body: f });
      else await api('/admin/categories', { method: 'POST', body: f });
      onChanged(editing ? `«${f.nameUz}» saqlandi` : `«${f.nameUz}» qo‘shildi`);
      startNew();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: AdminCategory) => {
    if (!confirm(`«${c.nameUz}» kategoriyasi o‘chirilsinmi?`)) return;
    try {
      await api(`/admin/categories/${c.id}`, { method: 'DELETE' });
      if (editing?.id === c.id) startNew();
      onChanged(`«${c.nameUz}» o‘chirildi`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const row = (c: AdminCategory, child: boolean) => (
    <tr key={c.id} className={`border-t border-slate-100 ${editing?.id === c.id ? 'bg-brand-50' : ''}`}>
      <td className={`py-2 ${child ? 'pl-10' : 'pl-4 font-medium'}`}>
        {child && <span className="mr-1 text-slate-400">└</span>}
        {c.nameUz}
      </td>
      <td className="py-2">{c.nameRu}</td>
      <td className="py-2 font-mono text-xs text-slate-500">{c.slug}</td>
      <td className="py-2 text-center">{c._count.products}</td>
      <td className="whitespace-nowrap py-2 pr-4 text-right">
        {!child && (
          <button className="mr-3 text-brand-700 hover:underline" onClick={() => startNew(c.id)}>
            + Subkategoriya
          </button>
        )}
        <button className="mr-3 hover:underline" onClick={() => startEdit(c)}>
          Tahrirlash
        </button>
        <button className="text-red-600 hover:underline" onClick={() => remove(c)}>
          O‘chirish
        </button>
      </td>
    </tr>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2 font-normal">Nomi (UZ)</th>
              <th className="font-normal">Nomi (RU)</th>
              <th className="font-normal">Slug</th>
              <th className="text-center font-normal">Mahsulot</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {parents.flatMap((p) => [row(p, false), ...categories.filter((c) => c.parentId === p.id).map((c) => row(c, true))])}
            {parents.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  Kategoriya yo‘q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <section className="card flex h-fit flex-col gap-3 p-5 text-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{editing ? 'Kategoriyani tahrirlash' : f.parentId ? 'Yangi subkategoriya' : 'Yangi kategoriya'}</h3>
          {(editing || f.parentId) && (
            <button className="text-xs text-slate-500 hover:underline" onClick={() => startNew()}>
              Bekor qilish
            </button>
          )}
        </div>
        <label className="flex flex-col gap-1">
          Joylashuvi
          <select
            className="input"
            value={f.parentId ?? ''}
            disabled={!!editing && editing._count.children > 0}
            onChange={(e) => setF({ ...f, parentId: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">Asosiy kategoriya</option>
            {parents
              .filter((p) => p.id !== editing?.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameUz} ichida (subkategoriya)
                </option>
              ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Nomi (O‘zbekcha) *
          <input
            className="input"
            value={f.nameUz}
            onChange={(e) => setF({ ...f, nameUz: e.target.value, slug: slugTouched ? f.slug : slugify(e.target.value) })}
          />
        </label>
        <label className="flex flex-col gap-1">
          Nomi (Русский) *
          <input className="input" value={f.nameRu} onChange={(e) => setF({ ...f, nameRu: e.target.value })} />
        </label>
        <div className="grid grid-cols-[1fr_90px] gap-3">
          <label className="flex flex-col gap-1">
            Slug *
            <input className="input font-mono text-xs" value={f.slug} onChange={(e) => (setSlugTouched(true), setF({ ...f, slug: slugify(e.target.value) }))} />
          </label>
          <label className="flex flex-col gap-1">
            Tartib
            <input className="input" type="number" value={f.position} onChange={(e) => setF({ ...f, position: Number(e.target.value) })} />
          </label>
        </div>
        {error && <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
        <button className="btn" disabled={busy} onClick={save}>
          {editing ? 'Saqlash' : 'Qo‘shish'}
        </button>
      </section>
    </div>
  );
}
