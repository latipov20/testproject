import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { apiGet, type Category, type Named, type ProductCard as P } from '@/lib/api';
import { dict, type Locale } from '@/lib/i18n';

type Search = { category?: string; animal?: string; q?: string; sort?: string; page?: string };

export default async function Catalog({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Search> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = dict(locale);
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
  const [categories, animals, result] = await Promise.all([
    apiGet<Category[]>('/categories', locale),
    apiGet<Named[]>('/animal-types', locale),
    apiGet<{ items: P[]; total: number }>(`/products?${qs}`, locale, 30),
  ]);

  const href = (patch: Partial<Search>) => {
    const next = new URLSearchParams({ ...sp, ...patch } as Record<string, string>);
    for (const [k, v] of [...next.entries()]) if (!v) next.delete(k);
    next.delete('page');
    return `/${locale}/catalog?${next}`;
  };
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm ${active ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white hover:border-brand-500'}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="flex flex-col gap-5">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-500">{t.categories}</h3>
          <div className="flex flex-wrap gap-2 lg:flex-col lg:items-start">
            <Link href={href({ category: '' })} className={chip(!sp.category)}>
              {t.all}
            </Link>
            {categories.map((c) => (
              <Link key={c.id} href={href({ category: c.slug })} className={chip(sp.category === c.slug)}>
                {c.name}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-500">{t.animals}</h3>
          <div className="flex flex-wrap gap-2">
            <Link href={href({ animal: '' })} className={chip(!sp.animal)}>
              {t.all}
            </Link>
            {animals.map((a) => (
              <Link key={a.id} href={href({ animal: a.slug })} className={chip(sp.animal === a.slug)}>
                {a.name}
              </Link>
            ))}
          </div>
        </div>
      </aside>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold">
            {sp.q ? `«${sp.q}»` : t.catalog} <span className="text-sm font-normal text-slate-500">{result.total} {t.found}</span>
          </h1>
          <div className="flex gap-2 text-sm">
            {(
              [
                ['new', t.sortNew],
                ['price_asc', t.sortPriceAsc],
                ['price_desc', t.sortPriceDesc],
              ] as const
            ).map(([key, label]) => (
              <Link key={key} href={href({ sort: key })} className={chip((sp.sort ?? 'new') === key)}>
                {label}
              </Link>
            ))}
          </div>
        </div>
        {result.items.length === 0 ? (
          <p className="card p-8 text-center text-slate-500">{t.nothingFound}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {result.items.map((p) => (
              <ProductCard key={p.id} p={p} locale={locale} t={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
