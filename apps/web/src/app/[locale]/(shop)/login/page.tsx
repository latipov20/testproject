'use client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { TelegramLogin } from '@/components/TelegramLogin';
import { dict, type Locale } from '@/lib/i18n';
import { refreshShop } from '@/lib/shop';

function LoginForm() {
  const { locale } = useParams<{ locale: Locale }>();
  const t = dict(locale);
  const router = useRouter();
  const next = useSearchParams().get('next') ?? `/${locale}/cabinet`;

  return (
    <div className="mx-auto max-w-sm py-6">
      <div className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">{t.login}</h1>
        <TelegramLogin
          t={t}
          onDone={() => {
            refreshShop();
            // Faqat sayt ichidagi manzilga qaytamiz.
            router.push(next.startsWith('/') && !next.startsWith('//') ? next : `/${locale}`);
          }}
        />
        {/* Adminlar Telegram bilan emas, login/parol bilan kiradi (asosiy domendan admin subdomeniga o'tadi). */}
        <a href={`/${locale}/admin/login`} className="border-t border-slate-100 pt-4 text-center text-sm text-slate-500 hover:text-slate-800">
          {t.staffLogin}
        </a>
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
