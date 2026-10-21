'use client';
// Brauzer uchun API klienti: tokenlarni saqlaydi va muddati o'tganda yangilaydi.
// MVP: tokenlar localStorage'da. Ishlab chiqarishda refresh token httpOnly cookie'ga ko'chiriladi.

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

export interface Session {
  accessToken: string;
  refreshToken: string;
  role: string;
  phone: string;
  // Faqat admin paneliga login/parol bilan kirganda.
  login?: string;
  superAdmin?: boolean;
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem('session');
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(s: Session | null) {
  try {
    if (s) localStorage.setItem('session', JSON.stringify(s));
    else localStorage.removeItem('session');
  } catch {}
  window.dispatchEvent(new Event('session'));
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function fetchOrFail(url: string, init: RequestInit) {
  try {
    return await fetch(url, init);
  } catch {
    throw new ApiError(0, 'Server bilan aloqa yo‘q. Birozdan keyin qayta urinib ko‘ring.');
  }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; locale?: string } = {}): Promise<T> {
  // FormData (fayl yuklash) bo'lsa, content-type'ni brauzer o'zi qo'yadi.
  const isForm = opts.body instanceof FormData;
  // Tarmoq xatosi (server uyg'onyapti, deploy, internet yo'q) tushunarli matnga aylanadi.
  const doFetch = (token?: string) =>
    fetchOrFail(API + path, {
      method: opts.method ?? 'GET',
      headers: {
        ...(isForm ? {} : { 'content-type': 'application/json' }),
        ...(opts.locale ? { 'accept-language': opts.locale } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
    });

  const session = getSession();
  let res = await doFetch(session?.accessToken);
  if (res.status === 401 && session?.refreshToken) {
    const r = await fetchOrFail(API + '/auth/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (r.ok) {
      const tokens = await r.json();
      setSession({ ...session, ...tokens });
      res = await doFetch(tokens.accessToken);
    } else {
      setSession(null);
    }
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = Array.isArray(json?.message) ? json.message.join(', ') : (json?.message ?? res.statusText);
    throw new ApiError(res.status, msg);
  }
  return json as T;
}
