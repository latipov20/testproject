import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { apiGet, type Category, type Named, type ProductCard as P } from '@/lib/api';
import { dict, type Locale } from '@/lib/i18n';

export default async function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = dict(locale);
  const [categories, animals, products] = await Promise.all([
    apiGet<Category[]>('/categories', locale),
    apiGet<Named[]>('/animal-types', locale),
    apiGet<{ items: P[] }>('/products?limit=12', locale),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white sm:p-10">
        <h1 className="max-w-xl text-2xl font-bold sm:text-3xl">{t.brandTagline}</h1>
        <p className="mt-2 max-w-xl text-brand-50">{t.otcNote}</p>
        <Link href={`/${locale}/catalog`} className="mt-5 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700">
          {t.catalog}
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t.animals}</h2>
        <div className="flex flex-wrap gap-2">
          {animals.map((a) => (
            <Link key={a.id} href={`/${locale}/catalog?animal=${a.slug}`} className="btn-ghost">
              {a.name}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t.categories}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => (
            <Link key={c.id} href={`/${locale}/catalog?category=${c.slug}`} className="card p-4 text-sm font-medium hover:border-brand-500">
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t.newProducts}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.items.map((p) => (
            <ProductCard key={p.id} p={p} locale={locale} t={t} />
          ))}
        </div>
      </section>
    </div>
  );
}
