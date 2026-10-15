'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSession, type Session } from '@/lib/client';

// Sessiya bo'lmasa kirish sahifasiga yo'naltiradi.
export function useAuthed(): Session | null {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    const s = getSession();
    if (!s) router.replace(`/${locale}/login?next=${encodeURIComponent(location.pathname)}`);
    else setSession(s);
  }, [router, locale]);
  return session;
}
