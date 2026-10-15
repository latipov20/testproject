import { BadRequestException, Body, Controller, Get, Module, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProductStatus, Role } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
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
  @IsOptional() @IsArray() @IsInt({ each: true }) animalTypeIds?: number[];
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => VariantDto) variants: VariantDto[];
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

class CategoryDto {
  @IsOptional() @IsInt() parentId?: number;
  @IsString() nameUz: string;
  @IsString() nameRu: string;
  @Matches(/^[a-z0-9-]+$/) slug: string;
}

@UseGuards(AuthGuard)
@Roles('ADMIN')
@Controller('admin')
class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('products')
  products(@Query('q') q?: string) {
    return this.prisma.product.findMany({
      where: q ? { OR: [{ titleUz: { contains: q, mode: 'insensitive' } }, { titleRu: { contains: q, mode: 'insensitive' } }] } : {},
      include: { variants: true, category: true, animalTypes: true, images: true },
      orderBy: { id: 'desc' },
    });
  }

  @Post('products')
  async createProduct(@CurrentUser() user: AuthUser, @Body() dto: ProductDto) {
    const product = await this.upsertProduct(dto);
    await this.audit(user, 'create', 'product', product.id);
    return product;
  }

  @Patch('products/:id')
  async updateProduct(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();
    if (existing.slug !== dto.slug) throw new BadRequestException('Slug o‘zgartirilmaydi');
    const product = await this.upsertProduct(dto);
    await this.audit(user, 'update', 'product', id);
    return product;
  }

  // Ommaviy import: admin panel Excel faylni o'qib, shu formatda yuboradi. Slug bo'yicha yangilanadi.
  @Post('products/import')
  async import(@CurrentUser() user: AuthUser, @Body() dto: ImportDto) {
    let count = 0;
    for (const p of dto.products) {
      await this.upsertProduct(p);
      count++;
    }
    await this.audit(user, 'import', 'product', undefined, { count });
    return { imported: count };
  }

  @Post('categories')
  createCategory(@Body() dto: CategoryDto) {
    return this.prisma.category.create({ data: dto });
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

  private async upsertProduct(dto: ProductDto) {
    const { variants, animalTypeIds, images, ...fields } = dto;
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.upsert({
        where: { slug: dto.slug },
        update: { ...fields, animalTypes: animalTypeIds ? { set: animalTypeIds.map((id) => ({ id })) } : undefined },
        create: { ...fields, animalTypes: { connect: (animalTypeIds ?? []).map((id) => ({ id })) } },
      });
      for (const v of variants) {
        await tx.productVariant.upsert({
          where: { sku: v.sku },
          update: { ...v, productId: product.id, active: true },
          create: { ...v, productId: product.id },
        });
      }
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: product.id } });
        await tx.productImage.createMany({ data: images.map((url, position) => ({ productId: product.id, url, position })) });
      }
      return tx.product.findUniqueOrThrow({ where: { id: product.id }, include: { variants: true, images: true, animalTypes: true } });
    });
  }

  private audit(user: AuthUser, action: string, entity: string, entityId?: number, diff?: object) {
    return this.prisma.auditLog.create({ data: { actorId: user.id, action, entity, entityId, diff } });
  }
}

@Module({ controllers: [AdminController] })
export class AdminModule {}
