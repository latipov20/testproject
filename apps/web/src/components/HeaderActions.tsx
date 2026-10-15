'use client';
import { ClipboardList, Heart, ShoppingBag, User, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSession, Session } from '@/lib/client';
import type { Dict, Locale } from '@/lib/i18n';
import { useShop } from '@/lib/shop';

export function useSession() {
  const [session, setS] = useState<Session | null>(null);
  useEffect(() => {
    const sync = () => setS(getSession());
    sync();
    window.addEventListener('session', sync);
    return () => window.removeEventListener('session', sync);
  }, []);
  return session;
}

export function LangSwitch({ locale, className = '' }: { locale: Locale; className?: string }) {
  const pathname = usePathname();
  return (
    <span className={`flex items-center gap-1 ${className}`}>
      {(['uz', 'ru'] as const).map((l) => (
        <Link
          key={l}
          href={pathname.replace(/^\/(uz|ru)/, `/${l}`)}
          onClick={() => (document.cookie = `locale=${l};path=/;max-age=31536000`)}
          className={`rounded-md px-2 py-0.5 font-semibold uppercase ${l === locale ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
        >
          {l === 'uz' ? 'O‘zb' : 'Рус'}
        </Link>
      ))}
    </span>
  );
}

function IconLink({ href, icon: Icon, label, badge }: { href: string; icon: LucideIcon; label: string; badge?: number }) {
  return (
    <Link href={href} className="group relative flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-xs text-slate-600 hover:text-brand-700">
      <Icon className="h-6 w-6" strokeWidth={1.75} />
      <span className="whitespace-nowrap">{label}</span>
      {!!badge && (
        <span className="absolute -top-0.5 right-1 min-w-5 rounded-full bg-sale-600 px-1.5 text-center text-[11px] font-bold leading-5 text-white">{badge > 99 ? '99+' : badge}</span>
      )}
    </Link>
  );
}

// Kompyuterda headerning o'ng tomonidagi ikonkalar. Telefonda ularning o'rnini pastki menyu bosadi.
// Do'kon faqat xaridor uchun: admin va kuryer backstage'ga (/admin, /courier) to'g'ridan-to'g'ri kiradi.
export function HeaderActions({ locale, t }: { locale: Locale; t: Dict }) {
  const session = useSession();
  const { cartCount, favorites } = useShop();

  return (
    <nav className="hidden items-center gap-1 md:flex">
      <IconLink href={`/${locale}/${session ? 'cabinet' : 'login'}`} icon={User} label={session ? t.profile : t.login} />
      <IconLink href={`/${locale}/orders`} icon={ClipboardList} label={t.orders} />
      <IconLink href={`/${locale}/favorites`} icon={Heart} label={t.favorites} badge={favorites.size} />
      <IconLink href={`/${locale}/cart`} icon={ShoppingBag} label={t.cart} badge={cartCount} />
    </nav>
  );
}
