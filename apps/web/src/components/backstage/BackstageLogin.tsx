'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { TelegramLogin } from '@/components/TelegramLogin';
import { setSession } from '@/lib/client';
import { dict, type Locale } from '@/lib/i18n';
import type { Area } from './useBackstage';

const TITLE: Record<Area, string> = { admin: 'Admin paneli', courier: 'Kuryer ilovasi' };
const ROLE: Record<Area, string> = { admin: 'ADMIN', courier: 'COURIER' };

export function BackstageLogin({ area }: { area: Area }) {
  const { locale } = useParams<{ locale: Locale }>();
  const router = useRouter();
  const [error, setError] = useState('');

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-6 shadow-card">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Vet Products · backstage</p>
          <h1 className="text-xl font-bold">{TITLE[area]}</h1>
        </div>
        <TelegramLogin
          t={dict(locale)}
          onDone={(user) => {
            if (user.role !== ROLE[area]) {
              setSession(null);
              setError(`${user.phone} raqamida bu bo‘limga ruxsat yo‘q. Administrator bilan bog‘laning.`);
              return;
            }
            router.replace(`/${locale}/${area}`);
          }}
        />
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}
