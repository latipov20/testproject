// Admin API (/v1/admin/*) qaytaradigan xom ma'lumotlar: ikkala til maydonlari bilan.

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export const STATUS_LABEL: Record<ProductStatus, string> = { DRAFT: 'Qoralama', ACTIVE: 'Sotuvda', ARCHIVED: 'Arxiv' };

export interface AdminCategory {
  id: number;
  parentId: number | null;
  nameUz: string;
  nameRu: string;
  slug: string;
  position: number;
  _count: { products: number; children: number };
}

export interface AdminVariant {
  id?: number;
  sku: string;
  packSize: string;
  price: number;
  oldPrice: number | null;
}

export interface AdminProduct {
  id: number;
  categoryId: number;
  slug: string;
  titleUz: string;
  titleRu: string;
  descriptionUz: string;
  descriptionRu: string;
  composition: string;
  dosageUz: string;
  dosageRu: string;
  manufacturer: string;
  registrationNo: string | null;
  storageTemp: string | null;
  status: ProductStatus;
  isNew: boolean;
  isTrending: boolean;
  category: { nameUz: string };
  animalTypes: { id: number }[];
  images: { url: string }[];
  variants: AdminVariant[];
}

export type ProductInput = Omit<AdminProduct, 'id' | 'category' | 'animalTypes' | 'images'> & {
  animalTypeIds: number[];
  images: string[];
};

export function toInput(p: AdminProduct): ProductInput {
  const { id: _id, category: _c, animalTypes, images, variants, ...rest } = p;
  return {
    ...rest,
    animalTypeIds: animalTypes.map((a) => a.id),
    images: images.map((i) => i.url),
    variants: variants.map(({ sku, packSize, price, oldPrice }) => ({ sku, packSize, price, oldPrice })),
  };
}

// API'ga yuboriladigan ko'rinish: bo'sh ixtiyoriy maydonlar null bo'ladi.
export function toPayload(p: ProductInput) {
  return {
    ...p,
    registrationNo: p.registrationNo?.trim() || null,
    storageTemp: p.storageTemp?.trim() || null,
    variants: p.variants.map((v) => ({ ...v, oldPrice: v.oldPrice || undefined })),
  };
}

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ы: 'i', э: 'e', ю: 'yu', я: 'ya',
  ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
};

// Nomdan URL uchun slug: kirill harflari lotinga o'giriladi, qolgani chiziqcha.
export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[‘’ʻʼ'`]/g, '')
    .split('')
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
