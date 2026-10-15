import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { animalEmoji } from '@/components/icons';
import { ProductGrid } from '@/components/ProductCard';
import { apiGet, type Category, type Named, type ProductPage } from '@/lib/api';
import { dict, type Locale } from '@/lib/i18n';

type Search = { category?: string; animal?: string; q?: string; sort?: string; page?: string; tag?: string };

export default async function Catalog({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Search> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = dict(locale);
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
  const [categories, animals, result] = await Promise.all([
    apiGet<Category[]>('/categories', locale),
    apiGet<Named[]>('/animal-types', locale),
    apiGet<ProductPage>(`/products?${qs}`, locale, 30),
  ]);

  // Filtr o'zgarsa birinchi sahifaga qaytiladi; sahifa raqami faqat pagination'da qo'yiladi.
  const href = (patch: Partial<Search>, keepPage = false) => {
    const next = new URLSearchParams({ ...sp, ...patch } as Record<string, string>);
    for (const [k, v] of [...next.entries()]) if (!v) next.delete(k);
    if (!keepPage) next.delete('page');
    return `/${locale}/catalog?${next}`;
  };

  const parent = categories.find((c) => c.slug === sp.category || c.children.some((ch) => ch.slug === sp.category));
  const sub = parent?.children.find((ch) => ch.slug === sp.category);
  const title = sp.q ? `«${sp.q}»` : sp.tag === 'trending' ? t.trending : sp.tag === 'new' ? t.newArrivals : (sub?.name ?? parent?.name ?? t.catalog);
  const pages = Math.max(1, Math.ceil(result.total / result.limit));
  const activeFilters = [sp.category, sp.animal, sp.tag].filter(Boolean).length;

  const link = (active: boolean) => `block rounded-lg px-3 py-1.5 text-sm ${active ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700 hover:bg-surface'}`;

  const filters = (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 px-3 text-sm font-bold">{t.categories}</h3>
        <Link href={href({ category: '' })} className={link(!sp.category)}>
          {t.all}
        </Link>
        {categories.map((c) => (
          <div key={c.id}>
            <Link href={href({ category: c.slug })} className={link(sp.category === c.slug)}>
              {c.name}
            </Link>
            {parent?.id === c.id && c.children.length > 0 && (
              <div className="ml-3 border-l border-slate-200 pl-2">
                {c.children.map((ch) => (
                  <Link key={ch.id} href={href({ category: ch.slug })} className={link(sp.category === ch.slug)}>
                    {ch.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div>
        <h3 className="mb-2 px-3 text-sm font-bold">{t.animals}</h3>
        <div className="flex flex-wrap gap-2 px-3">
          {animals.map((a) => (
            <Link key={a.id} href={href({ animal: sp.animal === a.slug ? '' : a.slug })} className={`chip py-1.5 ${sp.animal === a.slug ? 'chip-active' : ''}`}>
              <span aria-hidden>{animalEmoji(a.slug)}</span>
              {a.name}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 px-3">
        <Link href={href({ tag: sp.tag === 'trending' ? '' : 'trending' })} className={`chip py-1.5 ${sp.tag === 'trending' ? 'chip-active' : ''}`}>
          🔥 {t.badgeTrending}
        </Link>
        <Link href={href({ tag: sp.tag === 'new' ? '' : 'new' })} className={`chip py-1.5 ${sp.tag === 'new' ? 'chip-active' : ''}`}>
          ✨ {t.badgeNew}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        <Link href={`/${locale}`} className="hover:text-brand-700">
          {t.home}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/${locale}/catalog`} className="hover:text-brand-700">
          {t.catalog}
        </Link>
        {parent && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={href({ category: parent.slug })} className="hover:text-brand-700">
              {parent.name}
            </Link>
          </>
        )}
        {sub && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-slate-700">{sub.name}</span>
          </>
        )}
      </nav>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        <span className="text-sm text-slate-500">
          {result.total} {t.found}
        </span>
      </div>

      {parent && parent.children.length > 0 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <Link href={href({ category: parent.slug })} className={`chip ${sp.category === parent.slug ? 'chip-active' : ''}`}>
            {t.all}
          </Link>
          {parent.children.map((ch) => (
            <Link key={ch.id} href={href({ category: ch.slug })} className={`chip ${sp.category === ch.slug ? 'chip-active' : ''}`}>
              {ch.name}
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-36">{filters}</div>
        </aside>

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <details className="group relative lg:hidden">
              <summary className="chip cursor-pointer list-none">
                <SlidersHorizontal className="h-4 w-4" />
                {t.filters}
                {activeFilters > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-xs text-white">{activeFilters}</span>}
              </summary>
              <div className="absolute left-0 z-20 mt-2 w-[min(85vw,320px)] rounded-2xl border border-slate-200 bg-white py-4 shadow-lift">{filters}</div>
            </details>
            <span className="ml-auto hidden text-sm text-slate-500 sm:inline">{t.sortBy}:</span>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {(
                [
                  ['new', t.sortNew],
                  ['price_asc', t.sortPriceAsc],
                  ['price_desc', t.sortPriceDesc],
                ] as const
              ).map(([key, label]) => (
                <Link key={key} href={href({ sort: key })} className={`chip ${(sp.sort ?? 'new') === key ? 'chip-active' : ''}`}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {result.items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl bg-surface p-12 text-center">
              <span className="text-5xl" aria-hidden>
                🔍
              </span>
              <p className="text-slate-600">{t.nothingFound}</p>
              <Link href={`/${locale}/catalog`} className="btn">
                {t.allProducts}
              </Link>
            </div>
          ) : (
            <ProductGrid items={result.items} locale={locale} t={t} cols="lg:grid-cols-4" />
          )}

          {pages > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-2">
              {result.page > 1 && (
                <Link href={href({ page: String(result.page - 1) }, true)} className="btn-soft">
                  <ChevronLeft className="h-4 w-4" /> {t.prev}
                </Link>
              )}
              {Array.from({ length: pages }, (_, k) => k + 1).map((n) => (
                <Link
                  key={n}
                  href={href({ page: String(n) }, true)}
                  className={`flex h-10 min-w-10 items-center justify-center rounded-xl text-sm font-semibold ${n === result.page ? 'bg-slate-900 text-white' : 'bg-surface hover:bg-slate-200'}`}
                >
                  {n}
                </Link>
              ))}
              {result.page < pages && (
                <Link href={href({ page: String(result.page + 1) }, true)} className="btn-soft">
                  {t.next} <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
