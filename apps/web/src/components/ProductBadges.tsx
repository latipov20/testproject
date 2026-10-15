import type { Dict } from '@/lib/i18n';

export function ProductBadges({ isNew, isTrending, t, className = '' }: { isNew: boolean; isTrending: boolean; t: Dict; className?: string }) {
  if (!isNew && !isTrending) return null;
  return (
    <span className={`flex flex-wrap gap-1 ${className}`}>
      {isTrending && <span className="rounded-lg bg-amber-400 px-1.5 py-0.5 text-[11px] font-bold text-amber-950">🔥 {t.badgeTrending}</span>}
      {isNew && <span className="rounded-lg bg-brand-600 px-1.5 py-0.5 text-[11px] font-bold text-white">{t.badgeNew}</span>}
    </span>
  );
}
