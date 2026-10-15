import { Bug, Droplets, Package, Pill, Syringe, Wheat, type LucideIcon } from 'lucide-react';

// Kategoriya slug'i bo'yicha ikonka. Admin qo'shgan yangi kategoriyalarga umumiy quti ikonkasi.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  vitaminlar: Pill,
  'parazitlarga-qarshi': Bug,
  gigiyena: Droplets,
  'ozuqa-qoshimchalari': Wheat,
  jihozlar: Syringe,
};

const CATEGORY_TONES = ['bg-emerald-50 text-emerald-700', 'bg-amber-50 text-amber-700', 'bg-sky-50 text-sky-700', 'bg-rose-50 text-rose-700', 'bg-violet-50 text-violet-700', 'bg-lime-50 text-lime-700'];

export function CategoryIcon({ slug, index, className = '' }: { slug: string; index: number; className?: string }) {
  const Icon = CATEGORY_ICONS[slug] ?? Package;
  return (
    <span className={`flex items-center justify-center rounded-2xl ${CATEGORY_TONES[index % CATEGORY_TONES.length]} ${className}`}>
      <Icon className="h-1/2 w-1/2" strokeWidth={1.75} />
    </span>
  );
}

const ANIMAL_EMOJI: Record<string, string> = {
  qoramol: '🐄',
  'qoy-echki': '🐑',
  parranda: '🐔',
  ot: '🐎',
  it: '🐕',
  mushuk: '🐈',
};

export const animalEmoji = (slug: string) => ANIMAL_EMOJI[slug] ?? '🐾';
