'use client';
import { BadgeCheck, ChevronRight, ClipboardList, Heart, LogOut, MapPin, Phone, Send } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthed } from '@/components/useAuthed';
import { api, setSession } from '@/lib/client';
import { dict, type Locale } from '@/lib/i18n';

interface Me {
  phone: string;
  name: string | null;
  telegramUsername: string | null;
  telegramLinked: boolean;
  addresses: { id: number; street: string; landmark: string | null; zone: { regionUz: string; regionRu: string } }[];
}

export default function CabinetPage() {
  const { locale } = useParams<{ locale: Locale }>();
  const t = dict(locale);
  const router = useRouter();
  const session = useAuthed();
  const [me, setMe] = useState<Me>();
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!session) return;
    api<Me>('/me').then((m) => {
      setMe(m);
      setName(m.name ?? '');
    });
  }, [session]);

  const save = async () => {
    await api('/me', { method: 'PATCH', body: { name: name.trim() } });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!me) return null;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.cabinet}</h1>

      <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-2xl font-bold text-brand-700">
            {(me.name || me.phone).replace('+', '').charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{me.name || me.phone}</p>
            {me.telegramUsername && (
              <a href={`https://t.me/${me.telegramUsername}`} target="_blank" rel="noopener" className="flex items-center gap-1 text-sm text-[#229ED9]">
                <Send className="h-3.5 w-3.5" />@{me.telegramUsername}
              </a>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Phone className="h-4 w-4 text-slate-500" />
            <span className="text-lg font-semibold tracking-wide">{me.phone}</span>
            {me.telegramLinked && (
              <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                <BadgeCheck className="h-3.5 w-3.5" /> {t.phoneVerified}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">{t.courierSeesPhone}</p>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          {t.yourName}
          <div className="flex gap-2">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
            <button className="btn-soft whitespace-nowrap" onClick={save} disabled={name.trim() === (me.name ?? '')}>
              {saved ? t.saved : t.save}
            </button>
          </div>
        </label>
      </section>

      <nav className="flex flex-col divide-y divide-slate-100 rounded-3xl border border-slate-200 bg-white">
        {[
          { href: `/${locale}/orders`, icon: ClipboardList, label: t.orders },
          { href: `/${locale}/favorites`, icon: Heart, label: t.favorites },
        ].map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className="flex items-center gap-3 px-5 py-4 hover:bg-surface">
            <Icon className="h-5 w-5 text-brand-600" />
            <span className="flex-1 font-medium">{label}</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </Link>
        ))}
        <button
          onClick={() => {
            setSession(null);
            router.push(`/${locale}`);
          }}
          className="flex items-center gap-3 px-5 py-4 text-left text-sale-600 hover:bg-surface"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">{t.logout}</span>
        </button>
      </nav>

      {me.addresses.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-bold">{t.street}</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {[...new Map(me.addresses.map((a) => [`${a.zone.regionUz}|${a.street}`, a])).values()].slice(-5).map((a) => (
              <li key={a.id} className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>
                  {locale === 'ru' ? a.zone.regionRu : a.zone.regionUz}, {a.street}
                  {a.landmark && <span className="text-slate-500"> · {a.landmark}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
