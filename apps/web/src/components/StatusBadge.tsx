const COLORS: Record<string, string> = {
  NEW: 'bg-sky-50 text-sky-700',
  CONFIRMED: 'bg-indigo-50 text-indigo-700',
  PACKED: 'bg-amber-50 text-amber-700',
  SHIPPED: 'bg-violet-50 text-violet-700',
  DELIVERED: 'bg-brand-50 text-brand-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${COLORS[status] ?? 'bg-slate-100'}`}>{label}</span>;
}
