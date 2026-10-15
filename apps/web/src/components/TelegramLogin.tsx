'use client';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api, setSession } from '@/lib/client';
import type { Dict } from '@/lib/i18n';

interface Start {
  token: string;
  botUrl: string | null;
  dev: boolean;
}
export interface LoggedUser {
  id: number;
  phone: string;
  name: string | null;
  role: string;
}

// Telegram orqali kirish: token -> botda raqam yuboriladi -> botdan kelgan kod shu yerga kiritiladi.
export function TelegramLogin({ t, onDone }: { t: Dict; onDone: (user: LoggedUser) => void }) {
  const [start, setStart] = useState<Start | null>(null);
  const [state, setState] = useState<'idle' | 'waiting' | 'opened' | 'code_sent' | 'expired'>('idle');
  const [phone, setPhone] = useState('+998');
  const [devCode, setDevCode] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  const begin = async () => {
    setError('');
    setCode('');
    setDevCode('');
    setBusy(true);
    // Oyna bosish paytida ochiladi (keyinroq ochilsa brauzer popup sifatida bloklaydi), so'ng botga yo'naltiriladi.
    const tab = window.open('', '_blank');
    try {
      const s = await api<Start>('/auth/telegram/start', { method: 'POST' });
      setStart(s);
      setState('waiting');
      if (s.botUrl && tab) {
        tab.opener = null;
        tab.location.href = s.botUrl;
      } else tab?.close();
    } catch (e) {
      tab?.close();
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Bot holatini kuzatamiz: kod yuborilganda kiritish maydoniga fokus beriladi.
  useEffect(() => {
    if (!start?.botUrl || state === 'code_sent' || state === 'expired') return;
    const id = setInterval(async () => {
      const r = await api<{ state: typeof state }>(`/auth/telegram/status?token=${start.token}`).catch(() => null);
      if (r && r.state !== state) setState(r.state);
    }, 2000);
    return () => clearInterval(id);
  }, [start, state]);

  useEffect(() => {
    if (state === 'code_sent') codeRef.current?.focus();
  }, [state]);

  const devContact = async () => {
    if (!start) return;
    setError('');
    try {
      const r = await api<{ devCode: string }>('/auth/telegram/dev-contact', { method: 'POST', body: { token: start.token, phone: phone.replace(/\s/g, '') } });
      setDevCode(r.devCode);
      setState('code_sent');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const verify = async () => {
    if (!start) return;
    setError('');
    setBusy(true);
    try {
      const r = await api<{ accessToken: string; refreshToken: string; user: LoggedUser }>('/auth/telegram/verify', {
        method: 'POST',
        body: { token: start.token, code },
      });
      setSession({ accessToken: r.accessToken, refreshToken: r.refreshToken, role: r.user.role, phone: r.user.phone });
      onDone(r.user);
    } catch (e) {
      setError((e as Error).message);
      if (/eskirgan|Urinishlar/.test((e as Error).message)) setState('expired');
    } finally {
      setBusy(false);
    }
  };

  if (!start || state === 'expired') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600">{state === 'expired' ? t.tgExpired : t.tgIntro}</p>
        <button className="btn bg-[#229ED9] py-3 text-base hover:bg-[#1c8cc2]" onClick={begin} disabled={busy}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          {state === 'expired' ? t.tgRestart : t.tgOpenBot}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (!start.botUrl && !start.dev) {
    return <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{t.tgNotConfigured}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {start.botUrl ? (
        <>
          <ol className="flex flex-col gap-2 text-sm">
            {t.tgSteps.map((s, i) => {
              const done = (i === 0 && state !== 'waiting') || (i === 1 && state === 'code_sent');
              return (
                <li key={s} className="flex items-start gap-2">
                  {done ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                  ) : (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold">{i + 1}</span>
                  )}
                  <span className={done ? 'text-slate-500' : ''}>{s}</span>
                </li>
              );
            })}
          </ol>
          <p className={`flex items-center gap-2 rounded-xl p-3 text-sm ${state === 'code_sent' ? 'bg-brand-50 text-brand-800' : 'bg-surface text-slate-600'}`}>
            {state === 'code_sent' ? <CheckCircle2 className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
            {state === 'code_sent' ? t.tgCodeSent : t.tgWaiting}
          </p>
          <a href={start.botUrl} target="_blank" rel="noopener" className="text-center text-sm font-medium text-[#229ED9] hover:underline">
            {t.tgReopen}
          </a>
        </>
      ) : (
        <>
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{t.tgDevNote}</p>
          <div className="flex gap-2">
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" aria-label={t.phone} />
            <button className="btn-soft whitespace-nowrap" onClick={devContact}>
              {t.getCode}
            </button>
          </div>
          {devCode && (
            <p className="text-sm">
              {t.devCode}: <b className="tracking-widest">{devCode}</b>
            </p>
          )}
        </>
      )}

      <label className="flex flex-col gap-1 text-sm">
        {t.code}
        <input
          ref={codeRef}
          className="input text-center text-2xl font-bold tracking-[0.5em]"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && verify()}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="••••••"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn py-3 text-base" disabled={code.length !== 6 || busy} onClick={verify}>
        {t.confirm}
      </button>
    </div>
  );
}
