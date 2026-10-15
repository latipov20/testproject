'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// Gorizontal qator: telefonda barmoq bilan, kompyuterda strelkalar bilan aylantiriladi.
export function Scroller({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const go = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.9, behavior: 'smooth' });
  const arrow = 'absolute top-[30%] z-10 hidden h-11 w-11 items-center justify-center rounded-full bg-white text-slate-800 shadow-lift transition hover:scale-105 sm:flex';

  return (
    <div className="relative">
      <div ref={ref} className={className}>
        {children}
      </div>
      {!edges.start && (
        <button className={`${arrow} -left-4`} onClick={() => go(-1)} aria-label="‹">
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {!edges.end && (
        <button className={`${arrow} -right-4`} onClick={() => go(1)} aria-label="›">
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
