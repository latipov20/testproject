'use client';
import { Heart, Home, LayoutGrid, ShoppingBag, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Dict, Locale } from '@/lib/i18n';
import { useShop } from '@/lib/shop';
import { useSession } from './HeaderActions';

// Telefon uchun pastki menyu (marketplace ilovalaridagi kabi).
export function MobileNav({ locale, t }: { locale: Locale; t: Dict }) {
  const pathname = usePathname();
  const session = useSession();
  const { cartCount, favorites } = useShop();

  const cabinet = `/${locale}/${session ? 'cabinet' : 'login'}`;

  const items = [
    { href: `/${locale}`, icon: Home, label: t.home, exact: true },
    { href: `/${locale}/catalog`, icon: LayoutGrid, label: t.catalog },
    { href: `/${locale}/cart`, icon: ShoppingBag, label: t.cart, badge: cartCount },
    { href: `/${locale}/favorites`, icon: Heart, label: t.favorites, badge: favorites.size },
    { href: cabinet, icon: User, label: session ? t.profile : t.login },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {items.map(({ href, icon: Icon, label, badge, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={label} href={href} className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] ${active ? 'text-brand-700' : 'text-slate-500'}`}>
            <Icon className="h-6 w-6" strokeWidth={active ? 2.25 : 1.75} />
            {label}
            {!!badge && (
              <span className="absolute left-1/2 top-1 ml-2 min-w-[18px] rounded-full bg-sale-600 px-1 text-center text-[10px] font-bold leading-[18px] text-white">{badge > 99 ? '99+' : badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
