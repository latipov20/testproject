import { NextRequest, NextResponse } from 'next/server';

const LOCALES = ['uz', 'ru'];

// Backstage subdomenlari (masalan admin.latipov.org.uz, kuryer.latipov.org.uz). Bo'sh bo'lsa — faqat /admin, /courier yo'llari.
const AREA_HOSTS: Record<string, 'admin' | 'courier'> = {};
if (process.env.ADMIN_HOST) AREA_HOSTS[process.env.ADMIN_HOST] = 'admin';
if (process.env.COURIER_HOST) AREA_HOSTS[process.env.COURIER_HOST] = 'courier';

function preferredLocale(req: NextRequest) {
  const preferred = req.cookies.get('locale')?.value ?? (req.headers.get('accept-language')?.startsWith('ru') ? 'ru' : 'uz');
  return LOCALES.includes(preferred) ? preferred : 'uz';
}

// Redirect so'rov kelgan host bilan (dev serverda nextUrl ichki localhost'ni beradi).
function redirect(req: NextRequest, pathname: string, host = req.headers.get('host')) {
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '');
  return NextResponse.redirect(`${proto}://${host}${pathname}${req.nextUrl.search}`);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = (req.headers.get('host') ?? '').split(':')[0];
  const [, first, second] = pathname.split('/');
  const locale = LOCALES.includes(first) ? first : null;

  // Subdomenda faqat o'z bo'limi ochiladi: boshqa har qanday yo'l /{til}/{bo'lim} ga.
  const area = AREA_HOSTS[host];
  if (area) {
    if (locale && second === area) return;
    return redirect(req, `/${locale ?? preferredLocale(req)}/${area}`);
  }

  // Asosiy domendagi /admin va /courier o'z subdomeniga o'tadi (onrender.com manzili zaxira sifatida o'zgarmaydi).
  if (locale && (second === 'admin' || second === 'courier')) {
    const target = Object.keys(AREA_HOSTS).find((h) => AREA_HOSTS[h] === second);
    const parent = target?.split('.').slice(1).join('.');
    if (target && (host === parent || host === `www.${parent}`)) {
      return redirect(req, pathname, target);
    }
  }

  // Til prefiksi bo'lmagan manzillarni /uz yoki /ru ga yo'naltiradi.
  if (locale) return;
  return redirect(req, `/${preferredLocale(req)}${pathname}`);
}

export const config = { matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'] };
