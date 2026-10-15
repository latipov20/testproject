'use client';
import { useCallback, useEffect, useState } from 'react';
import { CategoryManager } from '@/components/admin/CategoryManager';
import type { AdminCategory } from '@/components/admin/types';
import { api } from '@/lib/client';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => api<AdminCategory[]>('/admin/categories').then(setCategories), []);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Kategoriyalar</h1>
      {msg && <p className="rounded-md bg-brand-50 p-3 text-brand-700">{msg}</p>}
      <CategoryManager
        categories={categories}
        onChanged={(m) => {
          setMsg(m);
          load();
        }}
      />
    </div>
  );
}
