'use client';
import { Boxes, ClipboardList, ExternalLink, FolderTree, LogOut, Menu, Package, Truck, X } from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useState } from 'react';
import { useBackstage } from '@/components/backstage/useBackstage';
import { setSession } from '@/lib/client';

// Admin backstage: do'kon dizaynidan alohida, ish uchun oddiy yon menyuli panel.
const NAV = [
  { href: '', label: 'Buyurtmalar', icon: ClipboardList },
  { href: '/products', label: 'Mahsulotlar', icon: Package },
  { href: '/categories', label: 'Kategoriyalar', icon: FolderTree },
  { href: '/stock', label: 'Ombor', icon: Boxes },
  { href: '/couriers', label: 'Kuryerlar', icon: Truck },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { locale } = useParams<{ locale: string }>();
  const pathname = usePathname();
  const base = `/${locale}/admin`;
  const isLogin = pathname === `${base}/login`;
  const { session, denied } = useBackstage('admin', !isLogin);
  const [open, setOpen] = useState(false);

  if (isLogin) return children;
  if (denied) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100 p-4 text-center">
        <p className="text-slate-600">Bu akkauntda admin paneliga ruxsat yo‘q.</p>
        <button className="btn" onClick={() => setSession(null)}>
          Boshqa akkaunt bilan kirish
        </button>
      </div>
    );
  }
  if (!session) return null;

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const full = base + href;
        const active = href ? pathname.startsWith(full) : pathname === base;
        return (
          <Link
            key={href}
            href={full}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${active ? 'bg-white/10 font-semibold text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-sm lg:grid lg:grid-cols-[220px_1fr]">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col gap-6 bg-slate-900 p-4 transition-transform lg:static lg:w-auto lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between">
          <span className="font-bold text-white">
            Vet Products <span className="font-normal text-slate-400">admin</span>
          </span>
          <button className="text-slate-400 lg:hidden" onClick={() => setOpen(false)} aria-label="Yopish">
            <X className="h-5 w-5" />
          </button>
        </div>
        {nav}
        <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4 text-slate-400">
          <span className="px-3 text-xs">{session.phone}</span>
          <Link href={`/${locale}`} target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 hover:text-white">
            <ExternalLink className="h-4 w-4" /> Saytni ochish
          </Link>
          <button onClick={() => setSession(null)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:text-white">
            <LogOut className="h-4 w-4" /> Chiqish
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Menyu">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold">Admin</span>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
