import { NextRequest, NextResponse } from 'next/server';

const LOCALES = ['uz', 'ru'];

// Til prefiksi bo'lmagan manzillarni /uz yoki /ru ga yo'naltiradi.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;
  const preferred = req.cookies.get('locale')?.value ?? (req.headers.get('accept-language')?.startsWith('ru') ? 'ru' : 'uz');
  const url = req.nextUrl.clone();
  url.pathname = `/${LOCALES.includes(preferred) ? preferred : 'uz'}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'] };
