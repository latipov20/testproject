import { ChevronRight, CreditCard, ShieldCheck, Truck } from 'lucide-react';
import Link from 'next/link';
import { HeroCarousel, type Slide } from '@/components/HeroCarousel';
import { animalEmoji, CategoryIcon } from '@/components/icons';
import { ProductGrid, ProductShelf } from '@/components/ProductCard';
import { apiGet, type Category, type Named, type ProductPage } from '@/lib/api';
import { dict, type Locale } from '@/lib/i18n';

interface Banner {
  id: number;
  title: string;
  imageUrl: string;
  link: string | null;
}

function SectionHead({ title, href, more }: { title: string; href?: string; more?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h2 className="section-title">{title}</h2>
      {href && (
        <Link href={href} className="flex items-center gap-0.5 whitespace-nowrap text-sm font-semibold text-brand-700 hover:underline">
          {more}
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export default async function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = dict(locale);
  const [categories, animals, banners, products, trending, newest] = await Promise.all([
    apiGet<Category[]>('/categories', locale),
    apiGet<Named[]>('/animal-types', locale),
    apiGet<Banner[]>('/banners', locale).catch(() => [] as Banner[]),
    apiGet<ProductPage>('/products?limit=20', locale),
    apiGet<ProductPage>('/products?tag=trending&limit=15', locale),
    apiGet<ProductPage>('/products?tag=new&limit=15', locale),
  ]);

  // Admin banner qo'shgan bo'lsa, ular birinchi chiqadi; standart slaydlar doim qoladi.
  const slides: Slide[] = [
    ...banners.map((b) => ({ title: b.title, href: b.link ?? `/${locale}/catalog`, imageUrl: b.imageUrl })),
    ...t.heroSlides.map((s) => ({ ...s, href: `/${locale}${s.href}` })),
  ];

  const perks = [
    { icon: Truck, title: t.deliveryTitle, text: t.deliveryAll },
    { icon: CreditCard, title: t.paymentTitle, text: t.paymentText },
    { icon: ShieldCheck, title: t.qualityTitle, text: t.qualityText },
  ];

  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      <div className="flex flex-col gap-4">
        <HeroCarousel slides={slides} />
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
          {perks.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex min-w-[260px] items-center gap-3 rounded-2xl bg-surface p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm">
                <b className="block">{title}</b>
                <span className="text-slate-600">{text}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <section>
        <SectionHead title={t.popularCategories} href={`/${locale}/catalog`} more={t.catalog} />
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-5">
          {categories.map((c, i) => (
            <Link
              key={c.id}
              href={`/${locale}/catalog?category=${c.slug}`}
              className="flex w-28 shrink-0 flex-col items-center gap-2 rounded-2xl p-2 text-center text-sm font-medium transition hover:bg-surface sm:w-auto sm:flex-row sm:p-3 sm:text-left"
            >
              <CategoryIcon slug={c.slug} index={i} className="h-16 w-16 shrink-0 sm:h-14 sm:w-14" />
              <span className="line-clamp-2">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {trending.items.length > 0 && (
        <section>
          <SectionHead title={`🔥 ${t.trending}`} href={`/${locale}/catalog?tag=trending`} more={t.showAll} />
          <ProductShelf items={trending.items} locale={locale} t={t} />
        </section>
      )}

      <section>
        <SectionHead title={t.byAnimal} />
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-6 sm:px-0">
          {animals.map((a) => (
            <Link
              key={a.id}
              href={`/${locale}/catalog?animal=${a.slug}`}
              className="flex w-24 shrink-0 flex-col items-center gap-2 rounded-2xl bg-surface p-3 text-center text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-card sm:w-auto"
            >
              <span className="text-4xl" aria-hidden>
                {animalEmoji(a.slug)}
              </span>
              {a.name}
            </Link>
          ))}
        </div>
      </section>

      {newest.items.length > 0 && (
        <section>
          <SectionHead title={`✨ ${t.newArrivals}`} href={`/${locale}/catalog?tag=new`} more={t.showAll} />
          <ProductShelf items={newest.items} locale={locale} t={t} />
        </section>
      )}

      <section>
        <SectionHead title={t.allProducts} href={`/${locale}/catalog`} more={t.showAll} />
        <ProductGrid items={products.items} locale={locale} t={t} />
        {products.total > products.items.length && (
          <div className="mt-8 flex justify-center">
            <Link href={`/${locale}/catalog`} className="btn-soft px-8">
              {t.more}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
