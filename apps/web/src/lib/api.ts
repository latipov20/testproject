// Server komponentlar uchun API so'rovlari (SSR).
import type { Locale } from './i18n';

const API = process.env.API_URL ?? 'http://localhost:4000/v1';

export async function apiGet<T>(path: string, locale: Locale, revalidate = 60): Promise<T> {
  const res = await fetch(API + path, { headers: { 'accept-language': locale }, next: { revalidate } });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

export interface ProductCard {
  id: number;
  slug: string;
  title: string;
  manufacturer: string;
  image: string | null;
  price: number;
  oldPrice: number | null;
  packSize: string;
  inStock: boolean;
  isNew: boolean;
  isTrending: boolean;
  variantId: number | null;
  variantCount: number;
}

export interface ProductPage {
  items: ProductCard[];
  total: number;
  page: number;
  limit: number;
}

export const discountPercent = (price: number, oldPrice: number | null) =>
  oldPrice && oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;

export interface Category {
  id: number;
  slug: string;
  name: string;
  children: Category[];
}

export interface Named {
  id: number;
  slug: string;
  name: string;
}

export interface ProductDetail {
  id: number;
  slug: string;
  title: string;
  description: string;
  dosage: string;
  composition: string;
  manufacturer: string;
  registrationNo: string | null;
  storageTemp: string | null;
  isNew: boolean;
  isTrending: boolean;
  category: { slug: string; name: string };
  animalTypes: { slug: string; name: string }[];
  images: string[];
  variants: { id: number; sku: string; packSize: string; price: number; oldPrice: number | null; stock: number }[];
  nearestExpiry: string | null;
}
