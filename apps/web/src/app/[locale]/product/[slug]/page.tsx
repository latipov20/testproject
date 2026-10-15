import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AddToCart } from '@/components/AddToCart';
import { ProductBadges } from '@/components/ProductBadges';
import { ProductImage } from '@/components/ProductImage';
import { apiGet, type ProductDetail } from '@/lib/api';
import { date } from '@/lib/format';
import { dict, type Locale } from '@/lib/i18n';

type Params = Promise<{ locale: Locale; slug: string }>;

async function load(locale: Locale, slug: string) {
  try {
    return await apiGet<ProductDetail>(`/products/${slug}`, locale, 30);
  } catch {
    notFound();
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await load(locale, slug);
  return { title: p.title, description: p.description.slice(0, 160) };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  const t = dict(locale);
  const p = await load(locale, slug);

  const facts: [string, string | null][] = [
    [t.manufacturer, p.manufacturer],
    [t.registrationNo, p.registrationNo],
    [t.storage, p.storageTemp],
    [t.expiry, p.nearestExpiry ? date(p.nearestExpiry, locale) : null],
  ];

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-sm text-slate-500">
        <Link href={`/${locale}/catalog`} className="hover:text-brand-700">
          {t.catalog}
        </Link>{' '}
        /{' '}
        <Link href={`/${locale}/catalog?category=${p.category.slug}`} className="hover:text-brand-700">
          {p.category.name}
        </Link>
      </nav>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="card overflow-hidden">
            <ProductImage src={p.images[0] ?? null} alt={p.title} className="aspect-square" />
          </div>
          {p.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {p.images.slice(1).map((src) => (
                <div key={src} className="card overflow-hidden">
                  <ProductImage src={src} alt={p.title} className="aspect-square" />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <ProductBadges isNew={p.isNew} isTrending={p.isTrending} t={t} />
          <h1 className="text-2xl font-bold">{p.title}</h1>
          <div className="flex flex-wrap gap-2">
            {p.animalTypes.map((a) => (
              <Link key={a.slug} href={`/${locale}/catalog?animal=${a.slug}`} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                {a.name}
              </Link>
            ))}
          </div>
          <AddToCart variants={p.variants} locale={locale} t={t} />
          <dl className="card divide-y divide-slate-100 text-sm">
            {facts
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
          </dl>
        </div>
      </div>
      {[
        [t.description, p.description],
        [t.dosage, p.dosage],
        [t.composition, p.composition],
      ]
        .filter(([, v]) => v)
        .map(([title, text]) => (
          <section key={title} className="card p-5">
            <h2 className="mb-2 font-semibold">{title}</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{text}</p>
          </section>
        ))}
    </div>
  );
}
