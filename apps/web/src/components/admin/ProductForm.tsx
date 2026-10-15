'use client';
import { useState } from 'react';
import { ProductImage } from '@/components/ProductImage';
import { api } from '@/lib/client';
import type { Named } from '@/lib/api';
import { AdminCategory, AdminProduct, ProductInput, ProductStatus, slugify, STATUS_LABEL, toInput, toPayload } from './types';

const EMPTY: ProductInput = {
  categoryId: 0,
  slug: '',
  titleUz: '',
  titleRu: '',
  descriptionUz: '',
  descriptionRu: '',
  composition: '',
  dosageUz: '',
  dosageRu: '',
  manufacturer: '',
  registrationNo: '',
  storageTemp: '',
  status: 'ACTIVE',
  isNew: true,
  isTrending: false,
  animalTypeIds: [],
  images: [],
  variants: [{ sku: '', packSize: '', price: 0, oldPrice: null }],
};

type Lang = 'Uz' | 'Ru';

// Mahsulotni qo'shish va tahrirlash. product berilmasa, yangi mahsulot yaratiladi.
export function ProductForm({
  product,
  categories,
  animals,
  onSaved,
  onCancel,
}: {
  product: AdminProduct | null;
  categories: AdminCategory[];
  animals: Named[];
  onSaved: (msg: string) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState<ProductInput>(() => (product ? toInput(product) : EMPTY));
  const [lang, setLang] = useState<Lang>('Uz');
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [imageUrl, setImageUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => setF((s) => ({ ...s, [k]: v }));
  const setText = (field: 'title' | 'description' | 'dosage', v: string) =>
    setF((s) => {
      const next = { ...s, [`${field}${lang}`]: v };
      if (field === 'title' && lang === 'Uz' && !slugTouched) next.slug = slugify(v);
      return next;
    });
  const text = (field: 'title' | 'description' | 'dosage') => f[`${field}${lang}`];

  const setVariant = (i: number, patch: Partial<ProductInput['variants'][number]>) =>
    set('variants', f.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  const upload = async (files: File[]) => {
    if (!files.length) return;
    setError('');
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const body = new FormData();
        body.append('file', file);
        const r = await api<{ url: string }>('/admin/uploads', { method: 'POST', body });
        urls.push(r.url);
      }
      setF((s) => ({ ...s, images: [...s.images, ...urls] }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const moveImage = (i: number, to: number) => {
    const next = [...f.images];
    const [img] = next.splice(i, 1);
    next.splice(to, 0, img);
    set('images', next);
  };

  // Ruscha matn kiritilmagan bo'lsa, saytda o'zbekchasi ko'rsatiladi; shuni eslatib turamiz.
  const missingRu =
    (!!f.titleUz.trim() && !f.titleRu.trim()) ||
    (!!f.descriptionUz.trim() && !f.descriptionRu.trim()) ||
    (!!f.dosageUz.trim() && !f.dosageRu.trim());

  const save = async () => {
    setError('');
    const problems = [
      !f.titleUz.trim() && 'nomi (UZ)',
      !f.titleRu.trim() && 'nomi (RU)',
      !f.slug && 'slug',
      !f.categoryId && 'kategoriya',
      f.variants.some((v) => !v.sku.trim() || !v.packSize.trim()) && 'har bir qadoqning SKU va hajmi',
      f.variants.some((v) => !v.price) && 'har bir qadoq narxi',
    ].filter(Boolean);
    if (problems.length) return setError(`To‘ldiring: ${problems.join(', ')}`);
    setBusy(true);
    try {
      const body = toPayload(f);
      if (product) await api(`/admin/products/${product.id}`, { method: 'PATCH', body });
      else await api('/admin/products', { method: 'POST', body });
      onSaved(product ? `«${f.titleUz}» saqlandi` : `«${f.titleUz}» qo‘shildi`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const parents = categories.filter((c) => c.parentId === null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-ghost py-2" onClick={onCancel}>
          ← Ro‘yxatga qaytish
        </button>
        <h2 className="text-lg font-semibold">{product ? `Tahrirlash: ${product.titleUz}` : 'Yangi mahsulot'}</h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          {/* Til bo'yicha matnlar */}
          <section className="card flex flex-col gap-3 p-5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">Nomi va tavsifi</h3>
              <div className="flex rounded-xl border border-slate-200 p-0.5">
                {(['Uz', 'Ru'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold ${lang === l ? 'bg-brand-600 text-white' : 'text-slate-600'}`}
                  >
                    {l === 'Uz' ? 'O‘zbekcha' : 'Русский'}
                    {l === 'Ru' && missingRu && <span className="ml-1 text-amber-500">●</span>}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1">
              Nomi ({lang.toUpperCase()}) *
              <input className="input" value={text('title')} onChange={(e) => setText('title', e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              Tavsif (opisaniye)
              <textarea className="input min-h-32" value={text('description')} onChange={(e) => setText('description', e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              Qo‘llash va dozalash
              <textarea className="input min-h-20" value={text('dosage')} onChange={(e) => setText('dosage', e.target.value)} />
            </label>
            {missingRu && <p className="text-xs text-amber-700">Ruscha matn to‘liq emas. Bo‘sh maydon o‘rniga saytda o‘zbekchasi chiqadi.</p>}
          </section>

          {/* Narx */}
          <section className="card flex flex-col gap-3 p-5 text-sm">
            <div>
              <h3 className="font-semibold">Narx va qadoqlar</h3>
              <p className="text-xs text-slate-500">
                Narx so‘mda. «Eski narx» to‘ldirilsa, saytda u chizilgan holda, yangi narx yonida chegirma sifatida chiqadi.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="pb-1 font-normal">Qadoq hajmi *</th>
                    <th className="pb-1 font-normal">SKU (artikul) *</th>
                    <th className="pb-1 font-normal">Narx, so‘m *</th>
                    <th className="pb-1 font-normal">Eski narx</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {f.variants.map((v, i) => (
                    <tr key={i}>
                      <td className="py-1 pr-2">
                        <input className="input" placeholder="100 ml" value={v.packSize} onChange={(e) => setVariant(i, { packSize: e.target.value })} />
                      </td>
                      <td className="py-1 pr-2">
                        <input className="input" placeholder="VIT-100" value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value.toUpperCase() })} />
                      </td>
                      <td className="py-1 pr-2">
                        <input
                          className="input"
                          type="number"
                          min={0}
                          step={500}
                          value={v.price || ''}
                          onChange={(e) => setVariant(i, { price: Math.max(0, Math.round(Number(e.target.value))) })}
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <input
                          className="input"
                          type="number"
                          min={0}
                          step={500}
                          value={v.oldPrice ?? ''}
                          onChange={(e) => setVariant(i, { oldPrice: e.target.value ? Math.max(0, Math.round(Number(e.target.value))) : null })}
                        />
                      </td>
                      <td className="py-1 text-right">
                        <button
                          type="button"
                          className="px-2 text-red-600 disabled:opacity-30"
                          disabled={f.variants.length === 1}
                          title="Qadoqni olib tashlash"
                          onClick={() => set('variants', f.variants.filter((_, j) => j !== i))}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              className="btn-ghost self-start py-2"
              onClick={() => set('variants', [...f.variants, { sku: '', packSize: '', price: 0, oldPrice: null }])}
            >
              + Qadoq qo‘shish
            </button>
          </section>

          {/* Rasmlar */}
          <section className="card flex flex-col gap-3 p-5 text-sm">
            <div>
              <h3 className="font-semibold">Rasmlar</h3>
              <p className="text-xs text-slate-500">Birinchi rasm asosiy bo‘ladi: u katalogda va mahsulot kartasida chiqadi.</p>
            </div>
            {f.images.length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {f.images.map((url, i) => (
                  <div key={url + i} className={`relative overflow-hidden rounded-xl border ${i === 0 ? 'border-brand-500 ring-2 ring-brand-100' : 'border-slate-200'}`}>
                    <ProductImage src={url} alt="" className="aspect-square" />
                    {i === 0 && <span className="absolute left-1 top-1 rounded bg-brand-600 px-1.5 text-[10px] font-semibold text-white">Asosiy</span>}
                    <div className="absolute inset-x-0 bottom-0 flex justify-between bg-white/90 text-xs">
                      <button type="button" className="px-2 py-1 disabled:opacity-30" disabled={i === 0} onClick={() => moveImage(i, i - 1)} title="Chapga">
                        ←
                      </button>
                      {i > 0 && (
                        <button type="button" className="px-1 py-1 text-brand-700" onClick={() => moveImage(i, 0)}>
                          Asosiy
                        </button>
                      )}
                      <button type="button" className="px-2 py-1 text-red-600" onClick={() => set('images', f.images.filter((_, j) => j !== i))} title="O‘chirish">
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <label className="btn-ghost cursor-pointer py-2">
                {busy ? 'Yuklanmoqda…' : 'Kompyuterdan yuklash'}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = '';
                    upload(files);
                  }}
                />
              </label>
              <span className="text-xs text-slate-500">yoki havola:</span>
              <input className="input w-auto flex-1" placeholder="https://…/rasm.jpg" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
              <button
                type="button"
                className="btn-ghost py-2"
                disabled={!/^https?:\/\//.test(imageUrl)}
                onClick={() => (set('images', [...f.images, imageUrl.trim()]), setImageUrl(''))}
              >
                Qo‘shish
              </button>
            </div>
          </section>

          {/* Qo'shimcha */}
          <section className="card grid gap-3 p-5 text-sm sm:grid-cols-2">
            <h3 className="font-semibold sm:col-span-2">Qo‘shimcha ma’lumot</h3>
            <label className="flex flex-col gap-1">
              Ishlab chiqaruvchi
              <input className="input" value={f.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              Ro‘yxat raqami
              <input className="input" value={f.registrationNo ?? ''} onChange={(e) => set('registrationNo', e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              Saqlash harorati
              <input className="input" placeholder="+2…+25 °C" value={f.storageTemp ?? ''} onChange={(e) => set('storageTemp', e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              Tarkibi (ikkala tilda bir xil)
              <textarea className="input min-h-16" value={f.composition} onChange={(e) => set('composition', e.target.value)} />
            </label>
          </section>
        </div>

        {/* O'ng ustun: joylashuv va holat */}
        <aside className="flex flex-col gap-4 text-sm">
          <section className="card flex flex-col gap-3 p-5">
            <label className="flex flex-col gap-1">
              Holati
              <select className="input" value={f.status} onChange={(e) => set('status', e.target.value as ProductStatus)}>
                {(Object.keys(STATUS_LABEL) as ProductStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={f.isNew} onChange={(e) => set('isNew', e.target.checked)} />
              Yangi mahsulot
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-amber-500" checked={f.isTrending} onChange={(e) => set('isTrending', e.target.checked)} />
              Trenddagi tovar
            </label>
            <p className="text-xs text-slate-500">Belgilanganlari bosh sahifadagi tegishli bo‘limda chiqadi.</p>
          </section>

          <section className="card flex flex-col gap-3 p-5">
            <label className="flex flex-col gap-1">
              Kategoriya / subkategoriya *
              <select className="input" value={f.categoryId || ''} onChange={(e) => set('categoryId', Number(e.target.value))}>
                <option value="" disabled>
                  Tanlang…
                </option>
                {parents.map((p) => (
                  <optgroup key={p.id} label={p.nameUz}>
                    <option value={p.id}>{p.nameUz}</option>
                    {categories
                      .filter((c) => c.parentId === p.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {p.nameUz} › {c.nameUz}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1">
              Hayvon turi
              <div className="flex flex-wrap gap-2">
                {animals.map((a) => {
                  const on = f.animalTypeIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => set('animalTypeIds', on ? f.animalTypeIds.filter((x) => x !== a.id) : [...f.animalTypeIds, a.id])}
                      className={`rounded-full border px-3 py-1 text-xs ${on ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white'}`}
                    >
                      {a.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="flex flex-col gap-1">
              Slug (sayt manzili) *
              <input
                className="input font-mono text-xs"
                value={f.slug}
                onChange={(e) => (setSlugTouched(true), set('slug', slugify(e.target.value)))}
              />
              <span className="break-all text-xs text-slate-500">/uz/product/{f.slug || '…'}</span>
            </label>
          </section>

          {error && <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
          <button className="btn" disabled={busy} onClick={save}>
            {busy ? 'Saqlanmoqda…' : product ? 'O‘zgarishlarni saqlash' : 'Mahsulotni qo‘shish'}
          </button>
        </aside>
      </div>
    </div>
  );
}
