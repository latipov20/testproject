'use client';
import { ChevronLeft, ChevronRight, PawPrint, Sparkles, TrendingUp, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { mediaUrl } from '@/lib/media';

export interface Slide {
  title: string;
  text?: string;
  cta?: string;
  href: string;
  imageUrl?: string;
}

const LOOKS: { bg: string; icon: LucideIcon }[] = [
  { bg: 'from-brand-600 via-brand-700 to-teal-800', icon: PawPrint },
  { bg: 'from-amber-500 via-orange-500 to-rose-500', icon: TrendingUp },
  { bg: 'from-sky-600 via-indigo-600 to-violet-700', icon: Sparkles },
];

// Bosh sahifadagi banner: admin qo'shgan bannerlar (rasmli) yoki standart aksiya slaydlari.
export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const paused = useRef(false);
  const n = slides.length;

  useEffect(() => {
    if (n < 2) return;
    const id = setInterval(() => !paused.current && setI((x) => (x + 1) % n), 6000);
    return () => clearInterval(id);
  }, [n]);

  return (
    <section
      className="relative overflow-hidden rounded-3xl"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      aria-roledescription="carousel"
    >
      <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${i * 100}%)` }}>
        {slides.map((s, k) => {
          const look = LOOKS[k % LOOKS.length];
          const Icon = look.icon;
          return (
            <Link
              key={k}
              href={s.href}
              aria-hidden={k !== i}
              tabIndex={k === i ? 0 : -1}
              className={`relative flex min-h-[180px] w-full shrink-0 items-center overflow-hidden bg-gradient-to-br p-6 text-white sm:min-h-[280px] sm:px-20 sm:py-12 ${look.bg}`}
            >
              {s.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(s.imageUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <>
                  <span className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-white/10 sm:h-96 sm:w-96" />
                  <span className="absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-white/10" />
                  <Icon className="absolute bottom-4 right-6 h-24 w-24 text-white/25 sm:bottom-8 sm:right-16 sm:h-44 sm:w-44" strokeWidth={1.25} />
                </>
              )}
              <div className={`relative max-w-lg ${s.imageUrl ? 'rounded-2xl bg-black/35 p-4 backdrop-blur-sm' : ''}`}>
                <h2 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">{s.title}</h2>
                {s.text && <p className="mt-2 text-sm text-white/85 sm:mt-3 sm:text-base">{s.text}</p>}
                {s.cta && <span className="mt-4 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 sm:mt-6">{s.cta}</span>}
              </div>
            </Link>
          );
        })}
      </div>

      {n > 1 && (
        <>
          <button
            onClick={() => setI((i - 1 + n) % n)}
            className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-slate-800 shadow hover:bg-white sm:flex"
            aria-label="‹"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setI((i + 1) % n)}
            className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-slate-800 shadow hover:bg-white sm:flex"
            aria-label="›"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((_, k) => (
              <button key={k} onClick={() => setI(k)} aria-label={`${k + 1}`} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
