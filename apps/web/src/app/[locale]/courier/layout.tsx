'use client';
import { LogOut } from 'lucide-react';
import { useParams, usePathname } from 'next/navigation';
import { useBackstage } from '@/components/backstage/useBackstage';
import { setSession } from '@/lib/client';

// Kuryer ilovasi: telefon uchun, do'kon dizaynisiz.
export default function CourierLayout({ children }: { children: React.ReactNode }) {
  const { locale } = useParams<{ locale: string }>();
  const pathname = usePathname();
  const isLogin = pathname === `/${locale}/courier/login`;
  const { session, denied } = useBackstage('courier', !isLogin);

  if (isLogin) return children;
  if (denied) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100 p-4 text-center">
        <p className="text-slate-600">{locale === 'ru' ? 'У этого аккаунта нет доступа к приложению курьера.' : 'Bu akkauntda kuryer ilovasiga ruxsat yo‘q.'}</p>
        <button className="btn" onClick={() => setSession(null)}>
          {locale === 'ru' ? 'Войти другим аккаунтом' : 'Boshqa akkaunt bilan kirish'}
        </button>
      </div>
    );
  }
  if (!session) return null;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-slate-900 px-4 py-3 text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}>
        <span className="font-bold">{locale === 'ru' ? 'Курьер' : 'Kuryer'}</span>
        <span className="text-sm text-slate-400">{session.phone}</span>
        <button className="ml-auto text-slate-300" onClick={() => setSession(null)} aria-label="Chiqish">
          <LogOut className="h-5 w-5" />
        </button>
      </header>
      <main className="mx-auto max-w-lg p-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
        {children}
      </main>
    </div>
  );
}
