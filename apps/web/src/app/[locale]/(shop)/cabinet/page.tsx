'use client';
import { BadgeCheck, ChevronRight, ClipboardList, Heart, LogOut, MapPin, Phone, RefreshCw, Send } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuthed } from '@/components/useAuthed';
import { api, setSession } from '@/lib/client';
import { date, price } from '@/lib/format';
import { dict, type Locale } from '@/lib/i18n';
import { useShop } from '@/lib/shop';

interface Me {
  phone: string;
  name: string | null;
  telegramUsername: string | null;
  telegramLinked: boolean;
  addresses: { id: number; street: string; landmark: string | null; zone: { regionUz: string; regionRu: string } }[];
}

interface Order {
  id: number;
  status: string;
  total: number;
  createdAt: string;
  items: { title: string; qty: number }[];
}

const ACTIVE = ['NEW', 'CONFIRMED', 'PACKED', 'SHIPPED'];

export default function CabinetPage() {
  const { locale } = useParams<{ locale: Locale }>();
  const t = dict(locale);
  const router = useRouter();
  const session = useAuthed();
  const { favorites, loaded: shopLoaded } = useShop();
  const [me, setMe] = useState<Me>();
  const [orders, setOrders] = useState<Order[]>();
  const [loadError, setLoadError] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Profil va buyurtmalar parallel yuklanadi. Server uyg'onayotgan bo'lsa (Render), qayta urinish tugmasi chiqadi.
  const load = useCallback(() => {
    setLoadError(false);
    Promise.all([api<Me>('/me'), api<Order[]>('/orders')])
      .then(([m, o]) => {
        setMe(m);
        setName(m.name ?? '');
        setOrders(o);
      })
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me || saving || name.trim() === (me.name ?? '')) return;
    setSaving(true);
    setSaveError('');
    try {
      await api('/me', { method: 'PATCH', body: { name: name.trim() } });
      setMe({ ...me, name: name.trim() || null });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t.loadError);
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl bg-surface p-10 text-center">
        <p className="text-slate-600">{t.loadError}</p>
        <button className="btn-soft" onClick={load}>
          <RefreshCw className="h-4 w-4" /> {t.retry}
        </button>
      </div>
    );
  }
  if (!me || !orders) return <CabinetSkeleton />;

  const active = orders.filter((o) => ACTIVE.includes(o.status));
  const recent = [...active, ...orders.filter((o) => !ACTIVE.includes(o.status))].slice(0, 3);
  // Bir xil manzil har buyurtmada qayta saqlanadi: ro'yxatda faqat oxirgi 5 ta noyobi ko'rinadi.
  const addresses = [...new Map(me.addresses.map((a) => [`${a.zone.regionUz}|${a.street}`, a])).values()].slice(-5).reverse();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.cabinet}</h1>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col gap-5">
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

            <form onSubmit={save} className="flex flex-col gap-1 text-sm">
              <label htmlFor="cabinet-name">{t.yourName}</label>
              <div className="flex gap-2">
                <input id="cabinet-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
                <button type="submit" className="btn-soft whitespace-nowrap" disabled={saving || name.trim() === (me.name ?? '')}>
                  {saved ? t.saved : t.save}
                </button>
              </div>
              {saveError && <p className="text-sale-600">{saveError}</p>}
            </form>
          </section>

          <nav className="flex flex-col divide-y divide-slate-100 rounded-3xl border border-slate-200 bg-white">
            {[
              { href: `/${locale}/orders`, icon: ClipboardList, label: t.orders, count: orders.length },
              { href: `/${locale}/favorites`, icon: Heart, label: t.favorites, count: shopLoaded ? favorites.size : 0 },
            ].map(({ href, icon: Icon, label, count }) => (
              <Link key={href} href={href} className="flex items-center gap-3 px-5 py-4 hover:bg-surface">
                <Icon className="h-5 w-5 text-brand-600" />
                <span className="flex-1 font-medium">{label}</span>
                {count > 0 && <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-slate-600">{count}</span>}
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
        </div>

        <div className="flex flex-col gap-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-bold">{t.recentOrders}</h2>
              {orders.length > 0 && (
                <Link href={`/${locale}/orders`} className="text-sm font-medium text-brand-700 hover:underline">
                  {t.allOrders}
                </Link>
              )}
            </div>
            {recent.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-6 text-center">
                <p className="text-sm text-slate-500">{t.noOrders}</p>
                <Link href={`/${locale}/catalog`} className="btn">
                  {t.catalog}
                </Link>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {recent.map((o) => (
                  <li key={o.id}>
                    <Link href={`/${locale}/orders/${o.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-slate-100 p-3 hover:border-brand-500">
                      <span className="font-semibold">{date(o.createdAt, locale)}</span>
                      <StatusBadge status={o.status} label={t.status[o.status]} />
                      <span className="ml-auto font-semibold">{price(o.total, t.sum)}</span>
                      <span className="w-full truncate text-sm text-slate-500">{o.items.map((i) => `${i.title} × ${i.qty}`).join(', ')}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {addresses.length > 0 && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="mb-3 font-bold">{t.myAddresses}</h2>
              <ul className="flex flex-col gap-2 text-sm">
                {addresses.map((a) => (
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
      </div>
    </div>
  );
}

function CabinetSkeleton() {
  return (
    <div className="mx-auto flex max-w-5xl animate-pulse flex-col gap-5">
      <div className="h-9 w-56 rounded-xl bg-slate-100" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col gap-5">
          <div className="h-72 rounded-3xl bg-slate-100" />
          <div className="h-44 rounded-3xl bg-slate-100" />
        </div>
        <div className="h-64 rounded-3xl bg-slate-100" />
      </div>
    </div>
  );
}
