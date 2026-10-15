'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSession, Session, setSession } from '@/lib/client';
import type { Dict, Locale } from '@/lib/i18n';

export function HeaderActions({ locale, t }: { locale: Locale; t: Dict }) {
  const pathname = usePathname();
  const [session, setS] = useState<Session | null>(null);

  useEffect(() => {
    const sync = () => setS(getSession());
    sync();
    window.addEventListener('session', sync);
    return () => window.removeEventListener('session', sync);
  }, []);

  const other = locale === 'uz' ? 'ru' : 'uz';
  const switchHref = pathname.replace(/^\/(uz|ru)/, `/${other}`);

  return (
    <nav className="ml-auto flex flex-wrap items-center justify-end gap-2 text-sm">
      <Link
        href={switchHref}
        onClick={() => (document.cookie = `locale=${other};path=/;max-age=31536000`)}
        className="rounded-lg px-2 py-1 font-medium uppercase text-slate-500 hover:bg-slate-100"
      >
        {other}
      </Link>
      {session?.role === 'COURIER' && (
        <Link href={`/${locale}/courier`} className="btn-ghost py-2">
          {t.courierPanel}
        </Link>
      )}
      {(session?.role === 'OPERATOR' || session?.role === 'ADMIN') && (
        <Link href={`/${locale}/staff`} className="btn-ghost py-2">
          {t.staffPanel}
        </Link>
      )}
      {session ? (
        <>
          {session.role === 'CUSTOMER' && (
            <Link href={`/${locale}/orders`} className="btn-ghost py-2">
              {t.orders}
            </Link>
          )}
          <button className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100" onClick={() => setSession(null)}>
            {t.logout}
          </button>
        </>
      ) : (
        <Link href={`/${locale}/login`} className="btn-ghost py-2">
          {t.login}
        </Link>
      )}
      {(!session || session.role === 'CUSTOMER') && (
        <Link href={`/${locale}/cart`} className="btn py-2">
          {t.cart}
        </Link>
      )}
    </nav>
  );
}
