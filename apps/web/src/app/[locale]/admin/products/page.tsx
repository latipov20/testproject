'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProductForm } from '@/components/admin/ProductForm';
import { AdminCategory, AdminProduct, ProductStatus, STATUS_LABEL, toInput, toPayload } from '@/components/admin/types';
import { ProductImage } from '@/components/ProductImage';
import type { Named } from '@/lib/api';
import { api } from '@/lib/client';
import { price } from '@/lib/format';

// Mahsulotlar: narx, rasm, tavsif, uz/ru matnlar, yangi/trend belgilari.
type Filter = 'all' | ProductStatus | 'new' | 'trending';

const STATUS_STYLE: Record<ProductStatus, string> = {
  ACTIVE: 'bg-brand-50 text-brand-700',
  DRAFT: 'bg-slate-100 text-slate-600',
  ARCHIVED: 'bg-red-50 text-red-700',
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [animals, setAnimals] = useState<Named[]>([]);
  const [editing, setEditing] = useState<AdminProduct | 'new' | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, c, a] = await Promise.all([api<AdminProduct[]>('/admin/products'), api<AdminCategory[]>('/admin/categories'), api<Named[]>('/animal-types', { locale: 'uz' })]);
      setProducts(p);
      setCategories(c);
      setAnimals(a);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const done = (text: string) => {
    setMsg({ ok: true, text });
    setEditing(null);
    load();
  };
  const fail = (e: unknown) => setMsg({ ok: false, text: (e as Error).message });

  // Ro'yxatdan turib bitta belgini almashtirish (yangi / trend / holat).
  const quickUpdate = async (p: AdminProduct, patch: Partial<Pick<AdminProduct, 'isNew' | 'isTrending' | 'status'>>) => {
    try {
      await api(`/admin/products/${p.id}`, { method: 'PATCH', body: toPayload({ ...toInput(p), ...patch }) });
      setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
    } catch (e) {
      fail(e);
    }
  };

  const remove = async (p: AdminProduct) => {
    if (!confirm(`«${p.titleUz}» o‘chirilsinmi?`)) return;
    try {
      const r = await api<{ archived?: boolean }>(`/admin/products/${p.id}`, { method: 'DELETE' });
      done(r.archived ? `«${p.titleUz}» sotilgan yoki omborda partiyasi bor, shuning uchun o‘chirilmadi: arxivga o‘tkazildi` : `«${p.titleUz}» o‘chirildi`);
    } catch (e) {
      fail(e);
    }
  };

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter((p) => {
      if (s && !`${p.titleUz} ${p.titleRu} ${p.slug} ${p.variants.map((v) => v.sku).join(' ')}`.toLowerCase().includes(s)) return false;
      if (filter === 'new') return p.isNew;
      if (filter === 'trending') return p.isTrending;
      return filter === 'all' || p.status === filter;
    });
  }, [products, q, filter]);

  const filters: [Filter, string][] = [
    ['all', `Barchasi (${products.length})`],
    ['ACTIVE', STATUS_LABEL.ACTIVE],
    ['DRAFT', STATUS_LABEL.DRAFT],
    ['ARCHIVED', STATUS_LABEL.ARCHIVED],
    ['new', `Yangi (${products.filter((p) => p.isNew).length})`],
    ['trending', `Trendda (${products.filter((p) => p.isTrending).length})`],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold">Mahsulotlar</h1>
        {!editing && (
          <button className="btn ml-auto py-2" onClick={() => (setEditing('new'), setMsg(null))}>
            + Yangi mahsulot
          </button>
        )}
      </div>

      {msg && (
        <p className={`flex items-start justify-between gap-3 rounded-md p-3 ${msg.ok ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} aria-label="Yopish">
            ✕
          </button>
        </p>
      )}

      {editing ? (
        <ProductForm
          key={editing === 'new' ? 'new' : editing.id}
          product={editing === 'new' ? null : editing}
          categories={categories}
          animals={animals}
          onSaved={done}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <input className="input max-w-xs py-2" placeholder="Nomi, slug yoki SKU bo‘yicha qidirish…" value={q} onChange={(e) => setQ(e.target.value)} />
            {filters.map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`rounded-md border px-3 py-1.5 ${filter === k ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="w-full min-w-[860px] text-left">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-normal">Mahsulot</th>
                  <th className="font-normal">Kategoriya</th>
                  <th className="font-normal">Narx</th>
                  <th className="font-normal">Holati</th>
                  <th className="text-center font-normal">Yangi</th>
                  <th className="text-center font-normal">Trend</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => {
                  const cheapest = p.variants[0];
                  return (
                    <tr key={p.id} className="border-t border-slate-100 align-middle">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <ProductImage src={p.images[0]?.url ?? null} alt="" className="h-11 w-11 shrink-0 rounded border border-slate-100 bg-slate-50" />
                          <div className="min-w-0">
                            <div className="font-medium">{p.titleUz}</div>
                            <div className="text-xs text-slate-500">{p.titleRu || <span className="text-amber-600">Ruscha nomi yo‘q</span>}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-slate-600">{p.category.nameUz}</td>
                      <td className="whitespace-nowrap">
                        {cheapest ? (
                          <>
                            <b>{price(cheapest.price, 'so‘m')}</b>
                            {cheapest.oldPrice && <div className="text-xs text-slate-400 line-through">{price(cheapest.oldPrice, 'so‘m')}</div>}
                            {p.variants.length > 1 && <div className="text-xs text-slate-500">{p.variants.length} ta qadoq</div>}
                          </>
                        ) : (
                          <span className="text-red-600">Narx yo‘q</span>
                        )}
                      </td>
                      <td>
                        <select
                          className={`rounded border-0 px-2 py-1 text-xs font-medium ${STATUS_STYLE[p.status]}`}
                          value={p.status}
                          onChange={(e) => quickUpdate(p, { status: e.target.value as ProductStatus })}
                        >
                          {(Object.keys(STATUS_LABEL) as ProductStatus[]).map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-center">
                        <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={p.isNew} onChange={(e) => quickUpdate(p, { isNew: e.target.checked })} />
                      </td>
                      <td className="text-center">
                        <input type="checkbox" className="h-4 w-4 accent-amber-500" checked={p.isTrending} onChange={(e) => quickUpdate(p, { isTrending: e.target.checked })} />
                      </td>
                      <td className="whitespace-nowrap pr-4 text-right">
                        <button className="mr-3 text-brand-700 hover:underline" onClick={() => (setEditing(p), setMsg(null))}>
                          Tahrirlash
                        </button>
                        <button className="text-red-600 hover:underline" onClick={() => remove(p)}>
                          O‘chirish
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      Mahsulot topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
