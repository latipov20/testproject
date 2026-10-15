import { ChevronRight, CreditCard, ShieldCheck, Truck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AddToCart } from '@/components/AddToCart';
import { Gallery } from '@/components/Gallery';
import { animalEmoji } from '@/components/icons';
import { ProductBadges } from '@/components/ProductBadges';
import { ProductShelf } from '@/components/ProductCard';
import { apiGet, type ProductDetail, type ProductPage as Page } from '@/lib/api';
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
  const similar = await apiGet<Page>(`/products?category=${p.category.slug}&limit=11`, locale).catch(() => null);
  const others = similar?.items.filter((x) => x.id !== p.id).slice(0, 10) ?? [];

  const facts: [string, string | null][] = [
    [t.manufacturer, p.manufacturer],
    [t.registrationNo, p.registrationNo],
    [t.storage, p.storageTemp],
    [t.expiry, p.nearestExpiry ? date(p.nearestExpiry, locale) : null],
  ];
  const texts = [
    [t.description, p.description],
    [t.dosage, p.dosage],
    [t.composition, p.composition],
  ].filter(([, v]) => v);

  return (
    <div className="flex flex-col gap-8">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        <Link href={`/${locale}`} className="hover:text-brand-700">
          {t.home}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/${locale}/catalog`} className="hover:text-brand-700">
          {t.catalog}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/${locale}/catalog?category=${p.category.slug}`} className="hover:text-brand-700">
          {p.category.name}
        </Link>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_360px] lg:gap-8">
        <Gallery images={p.images} alt={p.title} />

        <div className="flex flex-col gap-4">
          <ProductBadges isNew={p.isNew} isTrending={p.isTrending} t={t} />
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{p.title}</h1>
          {p.animalTypes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {p.animalTypes.map((a) => (
                <Link key={a.slug} href={`/${locale}/catalog?animal=${a.slug}`} className="chip py-1.5">
                  <span aria-hidden>{animalEmoji(a.slug)}</span>
                  {a.name}
                </Link>
              ))}
            </div>
          )}
          <dl className="flex flex-col gap-2 text-sm">
            {facts
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex items-baseline gap-2">
                  <dt className="shrink-0 text-slate-500">{k}</dt>
                  <span className="flex-1 border-b border-dotted border-slate-300" />
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
          </dl>
          {p.description && <p className="line-clamp-4 text-sm leading-relaxed text-slate-600">{p.description}</p>}
        </div>

        <aside className="flex flex-col gap-3 lg:sticky lg:top-36 lg:self-start">
          <AddToCart productId={p.id} variants={p.variants} locale={locale} t={t} />
          <div className="flex flex-col gap-3 rounded-3xl bg-surface p-5 text-sm">
            {[
              { icon: Truck, title: t.deliveryTitle, text: t.deliveryText },
              { icon: CreditCard, title: t.paymentTitle, text: t.paymentText },
              { icon: ShieldCheck, title: t.qualityTitle, text: t.qualityText },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                <span>
                  <b className="block">{title}</b>
                  <span className="text-slate-600">{text}</span>
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {texts.length > 0 && (
        <div className="grid gap-4 lg:max-w-4xl">
          {texts.map(([title, text]) => (
            <section key={title} className="rounded-3xl bg-surface p-6">
              <h2 className="mb-3 text-lg font-bold">{title}</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{text}</p>
            </section>
          ))}
        </div>
      )}

      {others.length > 0 && (
        <section>
          <h2 className="section-title mb-4">{p.category.name}</h2>
          <ProductShelf items={others} locale={locale} t={t} />
        </section>
      )}
    </div>
  );
}
