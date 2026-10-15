'use client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { api, setSession } from '@/lib/client';
import { dict, type Locale } from '@/lib/i18n';

function LoginForm() {
  const { locale } = useParams<{ locale: Locale }>();
  const t = dict(locale);
  const router = useRouter();
  const next = useSearchParams().get('next') ?? `/${locale}`;
  const [phone, setPhone] = useState('+998');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string>();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const send = () =>
    run(async () => {
      const res = await api<{ devCode?: string }>('/auth/otp/send', { method: 'POST', body: { phone: phone.replace(/\s/g, '') } });
      setDevCode(res.devCode);
      setStep('code');
    });

  const verify = () =>
    run(async () => {
      const p = phone.replace(/\s/g, '');
      const res = await api('/auth/otp/verify', { method: 'POST', body: { phone: p, code } });
      setSession({ accessToken: res.accessToken, refreshToken: res.refreshToken, role: res.user.role, phone: p });
      router.push(res.user.role === 'COURIER' ? `/${locale}/courier` : res.user.role === 'CUSTOMER' ? next : `/${locale}/staff`);
    });

  return (
    <div className="mx-auto max-w-sm">
      <div className="card flex flex-col gap-4 p-6">
        <h1 className="text-xl font-bold">{t.login}</h1>
        <label className="flex flex-col gap-1 text-sm">
          {t.phone}
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" disabled={step === 'code'} />
        </label>
        {step === 'code' && (
          <label className="flex flex-col gap-1 text-sm">
            {t.code}
            <input className="input tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} autoFocus />
          </label>
        )}
        {devCode && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {t.devCode}: <b>{devCode}</b>
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn" disabled={busy} onClick={step === 'phone' ? send : verify}>
          {step === 'phone' ? t.getCode : t.confirm}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
