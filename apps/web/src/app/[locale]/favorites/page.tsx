'use client';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProductGrid } from '@/components/ProductCard';
import { useAuthed } from '@/components/useAuthed';
import type { ProductPage } from '@/lib/api';
import { api } from '@/lib/client';
import { dict, type Locale } from '@/lib/i18n';
import { useShop } from '@/lib/shop';

export default function FavoritesPage() {
  const { locale } = useParams<{ locale: Locale }>();
  const t = dict(locale);
  const session = useAuthed();
  const { favorites, loaded } = useShop();
  const [items, setItems] = useState<ProductPage['items'] | null>(null);

  // Ro'yxatdan olib tashlangani darhol yo'qolmaydi: foydalanuvchi adashib bosgan bo'lsa qaytara oladi.
  useEffect(() => {
    if (!session || !loaded || items) return;
    const ids = [...favorites].slice(0, 60);
    if (!ids.length) return setItems([]);
    api<ProductPage>(`/products?ids=${ids.join(',')}&limit=60`, { locale }).then((r) => setItems(r.items));
  }, [session, loaded, favorites, items, locale]);

  if (!session || items === null) return null;
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.favorites}</h1>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-surface p-12 text-center">
          <Heart className="h-12 w-12 text-sale-500" />
          <p className="max-w-sm text-slate-600">{t.favoritesEmpty}</p>
          <Link href={`/${locale}/catalog`} className="btn">
            {t.catalog}
          </Link>
        </div>
      ) : (
        <ProductGrid items={items} locale={locale} t={t} />
      )}
    </div>
  );
}
