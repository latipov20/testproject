import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma, ProductStatus, Role } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { hashPassword } from '../auth/password';
import { AuthGuard, AuthUser, CurrentUser, Roles } from '../common/auth';
import { PrismaService } from '../prisma/prisma.service';

class VariantDto {
  @IsString() @MaxLength(60) sku: string;
  @IsString() @MaxLength(60) packSize: string;
  @IsInt() @Min(0) price: number;
  @IsOptional() @IsInt() @Min(0) oldPrice?: number;
}

class ProductDto {
  @IsInt() categoryId: number;
  @Matches(/^[a-z0-9-]+$/) slug: string;
  @IsString() @MaxLength(200) titleUz: string;
  @IsString() @MaxLength(200) titleRu: string;
  @IsOptional() @IsString() descriptionUz?: string;
  @IsOptional() @IsString() descriptionRu?: string;
  @IsOptional() @IsString() composition?: string;
  @IsOptional() @IsString() dosageUz?: string;
  @IsOptional() @IsString() dosageRu?: string;
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsString() registrationNo?: string;
  @IsOptional() @IsString() storageTemp?: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsOptional() @IsBoolean() isNew?: boolean;
  @IsOptional() @IsBoolean() isTrending?: boolean;
  @IsOptional() @IsArray() @IsInt({ each: true }) animalTypeIds?: number[];
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => VariantDto) variants: VariantDto[];
}

class ImportDto {
  @IsArray() @ArrayMaxSize(2000) @ValidateNested({ each: true }) @Type(() => ProductDto) products: ProductDto[];
}

class ZoneDto {
  @IsString() regionUz: string;
  @IsString() regionRu: string;
  @IsOptional() @IsString() district?: string;
  @IsInt() @Min(0) fee: number;
  @IsInt() @Min(0) daysMin: number;
  @IsInt() @Min(0) daysMax: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

class CourierDto {
  @Matches(/^\+998\d{9}$/) phone: string;
  @IsString() name: string;
  @IsOptional() @IsInt() zoneId?: number;
  @IsOptional() @IsString() vehicleType?: string;
}

class RoleDto {
  @IsEnum(Role) role: Role;
}

class AdminAccountDto {
  @Matches(/^[a-z0-9._-]{3,32}$/, { message: 'Login: 3-32 ta kichik lotin harf, raqam yoki . _ -' }) login: string;
  @IsString() @MinLength(8, { message: 'Parol kamida 8 belgi' }) @MaxLength(128) password: string;
  @IsString() @MaxLength(100) name: string;
  @Matches(/^\+998\d{9}$/, { message: 'Telefon +998XXXXXXXXX formatida bo‘lishi kerak' }) phone: string;
}

class CategoryDto {
  @IsOptional() @IsInt() parentId?: number | null;
  @IsString() @MaxLength(120) nameUz: string;
  @IsString() @MaxLength(120) nameRu: string;
  @Matches(/^[a-z0-9-]+$/) slug: string;
  @IsOptional() @IsInt() position?: number;
}

// Multer xotirada saqlagan fayl (faqat kerakli maydonlar).
interface UploadFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

const IMAGE_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
export const UPLOAD_DIR = join(process.cwd(), 'uploads');

@UseGuards(AuthGuard)
@Roles('ADMIN')
@Controller('admin')
class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('products')
  products(@Query('q') q?: string) {
    return this.prisma.product.findMany({
      where: q ? { OR: [{ titleUz: { contains: q, mode: 'insensitive' } }, { titleRu: { contains: q, mode: 'insensitive' } }] } : {},
      include: {
        variants: { where: { active: true }, orderBy: { price: 'asc' } },
        category: true,
        animalTypes: true,
        images: { orderBy: { position: 'asc' } },
      },
      orderBy: { id: 'desc' },
    });
  }

  @Post('products')
  async createProduct(@CurrentUser() user: AuthUser, @Body() dto: ProductDto) {
    const product = await this.saveProduct(dto);
    await this.audit(user, 'create', 'product', product.id);
    return product;
  }

  @Patch('products/:id')
  async updateProduct(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();
    const product = await this.saveProduct(dto, id);
    await this.audit(user, 'update', 'product', id);
    return product;
  }

  // Sotilgan yoki omborda partiyasi bor mahsulot o'chirilmaydi, arxivga o'tkaziladi (tarix saqlanadi).
  @Delete('products/:id')
  async deleteProduct(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: { variants: { select: { id: true } } } });
    if (!product) throw new NotFoundException();
    const variantIds = product.variants.map((v) => v.id);
    const [orders, batches] = await Promise.all([
      this.prisma.orderItem.count({ where: { variantId: { in: variantIds } } }),
      this.prisma.batch.count({ where: { variantId: { in: variantIds } } }),
    ]);
    if (orders || batches) {
      await this.prisma.product.update({ where: { id }, data: { status: 'ARCHIVED', isNew: false, isTrending: false } });
      await this.audit(user, 'archive', 'product', id);
      return { archived: true };
    }
    await this.prisma.$transaction([
      this.prisma.cartItem.deleteMany({ where: { variantId: { in: variantIds } } }),
      this.prisma.product.delete({ where: { id } }),
    ]);
    await this.audit(user, 'delete', 'product', id);
    return { deleted: true };
  }

  // Rasm API serverining uploads/ papkasiga yoziladi va /uploads/<fayl> manzilida beriladi.
  @Post('uploads')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async upload(@UploadedFile() file?: UploadFile) {
    const ext = file && IMAGE_EXT[file.mimetype];
    if (!file || !ext) throw new BadRequestException('Faqat JPG, PNG, WEBP yoki GIF rasm (5 MB gacha)');
    const name = `${randomUUID()}.${ext}`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(join(UPLOAD_DIR, name), file.buffer);
    return { url: `/uploads/${name}` };
  }

  // Ommaviy import: admin panel Excel faylni o'qib, shu formatda yuboradi. Slug bo'yicha yangilanadi.
  @Post('products/import')
  async import(@CurrentUser() user: AuthUser, @Body() dto: ImportDto) {
    let count = 0;
    for (const p of dto.products) {
      const existing = await this.prisma.product.findUnique({ where: { slug: p.slug }, select: { id: true } });
      await this.saveProduct(p, existing?.id);
      count++;
    }
    await this.audit(user, 'import', 'product', undefined, { count });
    return { imported: count };
  }

  @Get('categories')
  categories() {
    return this.prisma.category.findMany({
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      include: { _count: { select: { products: true, children: true } } },
    });
  }

  @Post('categories')
  async createCategory(@CurrentUser() user: AuthUser, @Body() dto: CategoryDto) {
    await this.checkParent(dto.parentId);
    const category = await this.prisma.category.create({ data: dto }).catch(dbError);
    await this.audit(user, 'create', 'category', category.id);
    return category;
  }

  @Patch('categories/:id')
  async updateCategory(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: CategoryDto) {
    await this.checkParent(dto.parentId, id);
    const category = await this.prisma.category.update({ where: { id }, data: { ...dto, parentId: dto.parentId ?? null } }).catch(dbError);
    await this.audit(user, 'update', 'category', id);
    return category;
  }

  @Delete('categories/:id')
  async deleteCategory(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    const c = await this.prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true, children: true } } } });
    if (!c) throw new NotFoundException();
    if (c._count.children) throw new BadRequestException('Avval subkategoriyalarni o‘chiring');
    if (c._count.products) throw new BadRequestException(`Kategoriyada ${c._count.products} ta mahsulot bor. Avval ularni boshqa kategoriyaga o‘tkazing`);
    await this.prisma.category.delete({ where: { id } });
    await this.audit(user, 'delete', 'category', id);
    return { deleted: true };
  }

  @Get('zones')
  zones() {
    return this.prisma.deliveryZone.findMany({ orderBy: { id: 'asc' } });
  }

  @Post('zones')
  createZone(@Body() dto: ZoneDto) {
    return this.prisma.deliveryZone.create({ data: dto });
  }

  @Patch('zones/:id')
  updateZone(@Param('id', ParseIntPipe) id: number, @Body() dto: ZoneDto) {
    return this.prisma.deliveryZone.update({ where: { id }, data: dto });
  }

  @Post('couriers')
  async createCourier(@CurrentUser() user: AuthUser, @Body() dto: CourierDto) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing?.role === 'ADMIN') throw new BadRequestException('Bu raqam administratorga tegishli, uni kuryer qilib bo‘lmaydi');
    const u = await this.prisma.user.upsert({
      where: { phone: dto.phone },
      update: { role: 'COURIER', name: dto.name },
      create: { phone: dto.phone, name: dto.name, role: 'COURIER' },
    });
    const courier = await this.prisma.courier.upsert({
      where: { userId: u.id },
      update: { zoneId: dto.zoneId, vehicleType: dto.vehicleType },
      create: { userId: u.id, zoneId: dto.zoneId, vehicleType: dto.vehicleType },
    });
    await this.audit(user, 'create', 'courier', courier.id);
    return courier;
  }

  @Patch('users/:id/role')
  async setRole(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: RoleDto) {
    if (id === user.id) throw new BadRequestException('O‘z rolingizni o‘zgartira olmaysiz');
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (dto.role === 'ADMIN' || target?.role === 'ADMIN') throw new ForbiddenException('Adminlarni faqat superadmin boshqaradi');
    const updated = await this.prisma.user.update({ where: { id }, data: { role: dto.role } });
    await this.audit(user, 'set_role', 'user', id, { role: dto.role });
    return updated;
  }

  // Oddiy hisobot: kunlik sotuv (bekor qilinganlarsiz) va umumiy qoldiq.
  @Get('reports/summary')
  async summary(@Query('days') days = '30') {
    const since = new Date(Date.now() - Number(days) * 86_400_000);
    const sales = await this.prisma.$queryRaw<{ day: Date; orders: number; revenue: number }[]>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::int AS orders, COALESCE(SUM(total), 0)::int AS revenue
      FROM "Order" WHERE status <> 'CANCELLED' AND "createdAt" >= ${since}
      GROUP BY 1 ORDER BY 1`;
    const stock = await this.prisma.batch.aggregate({ where: { qty: { gt: 0 }, expiryDate: { gt: new Date() } }, _sum: { qty: true } });
    const byStatus = await this.prisma.order.groupBy({ by: ['status'], _count: true });
    return { sales, stockUnits: stock._sum.qty ?? 0, ordersByStatus: byStatus };
  }

  // Ikki daraja: kategoriya va uning subkategoriyasi. Subkategoriya ichiga yana kategoriya qo'yilmaydi.
  private async checkParent(parentId: number | null | undefined, selfId?: number) {
    if (parentId == null) return;
    if (parentId === selfId) throw new BadRequestException('Kategoriya o‘ziga ota bo‘la olmaydi');
    const parent = await this.prisma.category.findUnique({ where: { id: parentId } });
    if (!parent) throw new BadRequestException('Ota kategoriya topilmadi');
    if (parent.parentId !== null) throw new BadRequestException('Subkategoriya ichida subkategoriya ochib bo‘lmaydi');
    if (selfId && (await this.prisma.category.count({ where: { parentId: selfId } })))
      throw new BadRequestException('Bu kategoriyaning subkategoriyalari bor, uni boshqa kategoriya ichiga qo‘yib bo‘lmaydi');
  }

  // id berilsa yangilaydi, bo'lmasa yaratadi. Formadan olib tashlangan qadoqlar:
  // sotilgan yoki partiyasi borlari o'chirilmaydi, faqat nofaol qilinadi.
  private async saveProduct(dto: ProductDto, id?: number) {
    const { variants, animalTypeIds, images, ...fields } = dto;
    const skus = variants.map((v) => v.sku);
    if (new Set(skus).size !== skus.length) throw new BadRequestException('SKU takrorlanmasligi kerak');
    const foreign = await this.prisma.productVariant.findFirst({ where: { sku: { in: skus }, ...(id ? { NOT: { productId: id } } : {}) } });
    if (foreign) throw new BadRequestException(`SKU ${foreign.sku} boshqa mahsulotda bor`);

    return this.prisma
      .$transaction(async (tx) => {
        const product = id
          ? await tx.product.update({
              where: { id },
              data: { ...fields, animalTypes: animalTypeIds ? { set: animalTypeIds.map((a) => ({ id: a })) } : undefined },
            })
          : await tx.product.create({ data: { ...fields, animalTypes: { connect: (animalTypeIds ?? []).map((a) => ({ id: a })) } } });

        for (const v of variants) {
          await tx.productVariant.upsert({
            where: { sku: v.sku },
            update: { packSize: v.packSize, price: v.price, oldPrice: v.oldPrice ?? null, active: true },
            create: { ...v, productId: product.id },
          });
        }
        const removed = await tx.productVariant.findMany({
          where: { productId: product.id, sku: { notIn: skus } },
          include: { _count: { select: { batches: true, orderItems: true } } },
        });
        for (const v of removed) {
          if (v._count.batches || v._count.orderItems) {
            await tx.productVariant.update({ where: { id: v.id }, data: { active: false } });
          } else {
            await tx.cartItem.deleteMany({ where: { variantId: v.id } });
            await tx.productVariant.delete({ where: { id: v.id } });
          }
        }

        if (images) {
          await tx.productImage.deleteMany({ where: { productId: product.id } });
          await tx.productImage.createMany({ data: images.map((url, position) => ({ productId: product.id, url, position })) });
        }
        return tx.product.findUniqueOrThrow({ where: { id: product.id }, include: { variants: true, images: true, animalTypes: true } });
      })
      .catch(dbError);
  }

  private audit(user: AuthUser, action: string, entity: string, entityId?: number, diff?: object) {
    return this.prisma.auditLog.create({ data: { actorId: user.id, action, entity, entityId, diff } });
  }
}

// Bazaning tushunarsiz xatolarini admin uchun o'qiladigan matnga aylantiradi.
function dbError(e: unknown): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new BadRequestException('Bu slug band, boshqasini kiriting');
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') throw new BadRequestException('Kategoriya yoki hayvon turi topilmadi');
  throw e;
}

// Adminlar: faqat superadmin qo'shadi va chiqaradi. Admin panelga login/parol bilan kiriladi.
@UseGuards(AuthGuard)
@Roles('ADMIN')
@Controller('admin/admins')
class AdminAccountsController {
  constructor(private readonly prisma: PrismaService) {}

  private async requireSuper(user: AuthUser) {
    const me = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!me?.superAdmin) throw new ForbiddenException('Faqat superadmin uchun');
  }

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    await this.requireSuper(user);
    return this.prisma.user.findMany({
      where: { role: 'ADMIN', passwordHash: { not: null } },
      select: { id: true, login: true, name: true, phone: true, superAdmin: true, createdAt: true },
      orderBy: { id: 'asc' },
    });
  }

  // Shu telefon bilan xaridor bo'lsa, o'sha akkaunt admin qilinadi.
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: AdminAccountDto) {
    await this.requireSuper(user);
    const taken = await this.prisma.user.findUnique({ where: { login: dto.login } });
    if (taken && taken.phone !== dto.phone) throw new BadRequestException('Bu login band');
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing?.superAdmin) throw new BadRequestException('Bu raqam superadminga tegishli');
    if (existing?.role === 'COURIER') throw new BadRequestException('Bu raqam kuryerga tegishli, avval kuryerlikdan chiqaring');
    const data = { login: dto.login, passwordHash: await hashPassword(dto.password), name: dto.name, role: 'ADMIN' as const };
    const u = await this.prisma.user.upsert({ where: { phone: dto.phone }, update: data, create: { ...data, phone: dto.phone } });
    await this.prisma.auditLog.create({ data: { actorId: user.id, action: 'create', entity: 'admin', entityId: u.id } });
    return { id: u.id, login: u.login, name: u.name, phone: u.phone, superAdmin: u.superAdmin, createdAt: u.createdAt };
  }

  // Admin oddiy xaridorga aylanadi, paroli o'chiriladi (amaldagi tokeni 1 soat ichida tugaydi).
  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    await this.requireSuper(user);
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target || target.role !== 'ADMIN') throw new NotFoundException();
    if (target.superAdmin) throw new BadRequestException('Superadminni o‘chirib bo‘lmaydi');
    await this.prisma.user.update({ where: { id }, data: { role: 'CUSTOMER', login: null, passwordHash: null } });
    await this.prisma.auditLog.create({ data: { actorId: user.id, action: 'remove', entity: 'admin', entityId: id } });
    return { ok: true };
  }
}

@Module({ controllers: [AdminController, AdminAccountsController] })
export class AdminModule {}
