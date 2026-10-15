import type { Dict } from '@/lib/i18n';

export function ProductBadges({ isNew, isTrending, t, className = '' }: { isNew: boolean; isTrending: boolean; t: Dict; className?: string }) {
  if (!isNew && !isTrending) return null;
  return (
    <span className={`flex flex-wrap gap-1 ${className}`}>
      {isTrending && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">{t.badgeTrending}</span>}
      {isNew && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">{t.badgeNew}</span>}
    </span>
  );
}
