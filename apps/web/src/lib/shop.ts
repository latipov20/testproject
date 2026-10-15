'use client';
// Xaridorning savat soni va sevimlilari: header, kartochkalar va mobil menyu bir manbadan o'qiydi.
import { useEffect, useSyncExternalStore } from 'react';
import { api, getSession } from './client';

interface State {
  cartCount: number;
  favorites: Set<number>;
  loaded: boolean;
}

let state: State = { cartCount: 0, favorites: new Set(), loaded: false };
const listeners = new Set<() => void>();
const emit = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));
const SERVER_STATE: State = { cartCount: 0, favorites: new Set(), loaded: false };

const isCustomer = () => getSession()?.role === 'CUSTOMER';

let inflight: Promise<void> | null = null;
export function refreshShop() {
  if (!isCustomer()) {
    emit({ cartCount: 0, favorites: new Set(), loaded: true });
    return Promise.resolve();
  }
  inflight ??= Promise.all([api<{ items: { qty: number }[] }>('/cart'), api<number[]>('/favorites')])
    .then(([cart, fav]) => emit({ cartCount: cart.items.reduce((s, i) => s + i.qty, 0), favorites: new Set(fav), loaded: true }))
    .catch(() => emit({ loaded: true }))
    .finally(() => (inflight = null));
  return inflight;
}

export function useShop() {
  const s = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
  useEffect(() => {
    if (!state.loaded) refreshShop();
    const onSession = () => refreshShop();
    window.addEventListener('session', onSession);
    return () => window.removeEventListener('session', onSession);
  }, []);
  return s;
}

// Savatga qo'shadi (bor bo'lsa sonini oshiradi). Kirmagan bo'lsa false qaytaradi.
export async function addToCart(variantId: number, qty = 1) {
  if (!getSession()) return false;
  const cart = await api<{ items: { variantId: number; qty: number }[] }>('/cart');
  const current = cart.items.find((i) => i.variantId === variantId)?.qty ?? 0;
  await api('/cart/items', { method: 'PUT', body: { variantId, qty: Math.min(99, current + qty) } });
  await refreshShop();
  return true;
}

export async function toggleFavorite(productId: number) {
  if (!getSession()) return false;
  const on = state.favorites.has(productId);
  const next = new Set(state.favorites);
  if (on) next.delete(productId);
  else next.add(productId);
  emit({ favorites: next });
  try {
    await api(`/favorites/${productId}`, { method: on ? 'DELETE' : 'POST' });
  } catch {
    refreshShop();
  }
  return true;
}
