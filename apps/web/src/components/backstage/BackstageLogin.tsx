'use client';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { TelegramLogin } from '@/components/TelegramLogin';
import { api, setSession } from '@/lib/client';
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
        {area === 'admin' ? (
          <PasswordLogin onDone={() => router.replace(`/${locale}/admin`)} />
        ) : (
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
        )}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: { phone: string; role: string; login: string; superAdmin: boolean };
}

// Admin paneli: faqat login/parol (Telegram orqali admin huquqi berilmaydi).
function PasswordLogin({ onDone }: { onDone: () => void }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await api<LoginResponse>('/auth/admin/login', { method: 'POST', body: { login, password } });
      setSession({ accessToken: r.accessToken, refreshToken: r.refreshToken, role: r.user.role, phone: r.user.phone, login: r.user.login, superAdmin: r.user.superAdmin });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <label className="flex flex-col gap-1 text-sm">
        Login
        <input className="input" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" autoCapitalize="none" autoFocus />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Parol
        <div className="relative">
          <input
            className="input pr-11"
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-700"
            onClick={() => setShow(!show)}
            aria-label={show ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
          >
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn py-3 text-base" disabled={!login.trim() || !password || busy}>
        {busy && <Loader2 className="h-5 w-5 animate-spin" />}
        Kirish
      </button>
    </form>
  );
}
