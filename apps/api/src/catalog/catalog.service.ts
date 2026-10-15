import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Lang, pick } from '../common/i18n';
import { PrismaService } from '../prisma/prisma.service';

export interface ProductQuery {
  category?: string;
  animal?: string;
  q?: string;
  tag?: 'new' | 'trending';
  sort?: 'new' | 'price_asc' | 'price_desc';
  page?: number;
  limit?: number;
}

const productInclude = {
  variants: { where: { active: true }, orderBy: { price: 'asc' } },
  images: { orderBy: { position: 'asc' } },
  animalTypes: true,
  category: true,
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async categories(lang: Lang) {
    const all = await this.prisma.category.findMany({ orderBy: [{ position: 'asc' }, { id: 'asc' }] });
    const node = (c: (typeof all)[number]): any => ({
      id: c.id,
      slug: c.slug,
      name: pick(c, 'name', lang),
      children: all.filter((x) => x.parentId === c.id).map(node),
    });
    return all.filter((c) => c.parentId === null).map(node);
  }

  async animalTypes(lang: Lang) {
    const all = await this.prisma.animalType.findMany({ orderBy: { id: 'asc' } });
    return all.map((a) => ({ id: a.id, slug: a.slug, name: pick(a, 'name', lang) }));
  }

  async banners(lang: Lang) {
    const all = await this.prisma.banner.findMany({ where: { active: true }, orderBy: { position: 'asc' } });
    return all.map((b) => ({ id: b.id, title: pick(b, 'title', lang), imageUrl: b.imageUrl, link: b.link }));
  }

  async products(query: ProductQuery, lang: Lang) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(60, Math.max(1, query.limit ?? 24));
    const where: Prisma.ProductWhereInput = { status: 'ACTIVE' };

    if (query.category) {
      const ids = await this.categoryWithDescendants(query.category);
      where.categoryId = { in: ids };
    }
    if (query.tag === 'new') where.isNew = true;
    if (query.tag === 'trending') where.isTrending = true;
    if (query.animal) where.animalTypes = { some: { slug: query.animal } };
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { titleUz: { contains: q, mode: 'insensitive' } },
        { titleRu: { contains: q, mode: 'insensitive' } },
        { manufacturer: { contains: q, mode: 'insensitive' } },
        { composition: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({ where, include: productInclude, orderBy: { createdAt: 'desc' } }),
    ]);

    let items = rows.map((p) => this.card(p, lang));
    if (query.sort === 'price_asc') items.sort((a, b) => a.price - b.price);
    if (query.sort === 'price_desc') items.sort((a, b) => b.price - a.price);
    items = items.slice((page - 1) * limit, page * limit);

    const stock = await this.stockByVariant(items.flatMap((i) => i.variantIds));
    return {
      total,
      page,
      limit,
      items: items.map(({ variantIds, ...i }) => ({ ...i, inStock: variantIds.some((id) => (stock.get(id) ?? 0) > 0) })),
    };
  }

  async product(slug: string, lang: Lang) {
    const p = await this.prisma.product.findFirst({ where: { slug, status: 'ACTIVE' }, include: productInclude });
    if (!p) throw new NotFoundException();
    const stock = await this.stockByVariant(p.variants.map((v) => v.id));
    const nearestExpiry = await this.prisma.batch.findFirst({
      where: { variantId: { in: p.variants.map((v) => v.id) }, qty: { gt: 0 }, expiryDate: { gt: new Date() } },
      orderBy: { expiryDate: 'asc' },
      select: { expiryDate: true },
    });
    return {
      id: p.id,
      slug: p.slug,
      title: pick(p, 'title', lang),
      description: pick(p, 'description', lang),
      dosage: pick(p, 'dosage', lang),
      composition: p.composition,
      manufacturer: p.manufacturer,
      registrationNo: p.registrationNo,
      storageTemp: p.storageTemp,
      isNew: p.isNew,
      isTrending: p.isTrending,
      category: { slug: p.category.slug, name: pick(p.category, 'name', lang) },
      animalTypes: p.animalTypes.map((a) => ({ slug: a.slug, name: pick(a, 'name', lang) })),
      images: p.images.map((i) => i.url),
      variants: p.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        packSize: v.packSize,
        price: v.price,
        oldPrice: v.oldPrice,
        stock: stock.get(v.id) ?? 0,
      })),
      nearestExpiry: nearestExpiry?.expiryDate ?? null,
    };
  }

  // Sotuvga yaroqli (muddati o'tmagan) qoldiq, variant bo'yicha.
  async stockByVariant(variantIds: number[]) {
    if (!variantIds.length) return new Map<number, number>();
    const rows = await this.prisma.batch.groupBy({
      by: ['variantId'],
      where: { variantId: { in: variantIds }, expiryDate: { gt: new Date() } },
      _sum: { qty: true },
    });
    return new Map(rows.map((r) => [r.variantId, r._sum.qty ?? 0]));
  }

  private card(p: ProductWithRelations, lang: Lang) {
    const cheapest = p.variants[0];
    return {
      id: p.id,
      slug: p.slug,
      title: pick(p, 'title', lang),
      manufacturer: p.manufacturer,
      image: p.images[0]?.url ?? null,
      price: cheapest?.price ?? 0,
      oldPrice: cheapest?.oldPrice ?? null,
      packSize: cheapest?.packSize ?? '',
      isNew: p.isNew,
      isTrending: p.isTrending,
      variantIds: p.variants.map((v) => v.id),
    };
  }

  private async categoryWithDescendants(slug: string): Promise<number[]> {
    const all = await this.prisma.category.findMany({ select: { id: true, parentId: true, slug: true } });
    const root = all.find((c) => c.slug === slug);
    if (!root) return [];
    const ids = [root.id];
    for (let i = 0; i < ids.length; i++) {
      for (const c of all) if (c.parentId === ids[i]) ids.push(c.id);
    }
    return ids;
  }
}
