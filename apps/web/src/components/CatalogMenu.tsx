'use client';
import { ChevronRight, LayoutGrid, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import type { Category } from '@/lib/api';
import type { Dict, Locale } from '@/lib/i18n';
import { CategoryIcon } from './icons';

// "Katalog" tugmasi va mega-menyu: chapda kategoriyalar, o'ngda tanlanganining subkategoriyalari.
function Menu({ locale, t, categories }: { locale: Locale; t: Dict; categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => setOpen(false), [pathname, search]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = categories[active];

  return (
    <div ref={ref} className="hidden md:block">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${open ? 'bg-slate-900 text-white' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'}`}
      >
        {open ? <X className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
        {t.catalog}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full border-t border-slate-100 bg-white shadow-lift">
          <div className="mx-auto grid max-h-[70vh] max-w-7xl grid-cols-[300px_1fr] gap-6 overflow-y-auto px-4 py-5">
            <ul className="flex flex-col">
              {categories.map((c, i) => (
                <li key={c.id}>
                  <Link
                    href={`/${locale}/catalog?category=${c.slug}`}
                    onMouseEnter={() => setActive(i)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${i === active ? 'bg-surface font-semibold' : 'hover:bg-surface'}`}
                  >
                    <CategoryIcon slug={c.slug} index={i} className="h-9 w-9" />
                    <span className="flex-1">{c.name}</span>
                    {c.children.length > 0 && <ChevronRight className="h-4 w-4 text-slate-400" />}
                  </Link>
                </li>
              ))}
            </ul>
            {current && (
              <div>
                <Link href={`/${locale}/catalog?category=${current.slug}`} className="text-xl font-bold hover:text-brand-700">
                  {current.name}
                </Link>
                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 lg:grid-cols-3">
                  {current.children.map((ch) => (
                    <Link key={ch.id} href={`/${locale}/catalog?category=${ch.slug}`} className="py-1 text-sm text-slate-700 hover:text-brand-700">
                      {ch.name}
                    </Link>
                  ))}
                  <Link href={`/${locale}/catalog?category=${current.slug}`} className="py-1 text-sm font-semibold text-brand-700 hover:underline">
                    {t.showAll} →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function CatalogMenu(props: { locale: Locale; t: Dict; categories: Category[] }) {
  return (
    <Suspense>
      <Menu {...props} />
    </Suspense>
  );
}
