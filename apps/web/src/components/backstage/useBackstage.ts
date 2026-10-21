'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSession, sessionKey, type Session } from '@/lib/client';

export type Area = 'admin' | 'courier';
const ROLE: Record<Area, string> = { admin: 'ADMIN', courier: 'COURIER' };

// Backstage himoyasi: kirmagan bo'lsa o'z login sahifasiga, roli mos kelmasa "ruxsat yo'q".
export function useBackstage(area: Area, enabled = true) {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const sync = () => {
      const s = getSession();
      if (!s) {
        setSession(null);
        router.replace(`/${locale}/${area}/login`);
      } else if (s.role !== ROLE[area]) {
        setDenied(true);
      } else {
        setDenied(false);
        setSession(s);
      }
    };
    sync();
    // Boshqa tabda shu bo'limdan chiqilsa yoki qayta kirilsa, bu tab ham moslashadi.
    const onStorage = (e: StorageEvent) => e.key === sessionKey() && sync();
    window.addEventListener('session', sync);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('session', sync);
      window.removeEventListener('storage', onStorage);
    };
  }, [area, enabled, locale, router]);

  return { session, denied };
}
