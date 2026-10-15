import { Body, Controller, Delete, Get, Headers, Module, NotFoundException, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { AuthGuard, AuthUser, CurrentUser } from '../common/auth';
import { langFrom, pick } from '../common/i18n';
import { CatalogService } from '../catalog/catalog.service';
import { PrismaService } from '../prisma/prisma.service';

class CartItemDto {
  @IsInt() variantId: number;
  @IsInt() @Min(0) @Max(99) qty: number;
}

class AddressDto {
  @IsInt() zoneId: number;
  @IsString() @MaxLength(300) street: string;
  @IsOptional() @IsString() @MaxLength(200) landmark?: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
}

@UseGuards(AuthGuard)
@Controller()
class CartController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
  ) {}

  @Get('cart')
  async get(@CurrentUser() user: AuthUser, @Headers('accept-language') al?: string) {
    const lang = langFrom(al);
    const items = await this.prisma.cartItem.findMany({
      where: { userId: user.id },
      include: { variant: { include: { product: { include: { images: { take: 1, orderBy: { position: 'asc' } } } } } } },
      orderBy: { id: 'asc' },
    });
    const stock = await this.catalog.stockByVariant(items.map((i) => i.variantId));
    const rows = items.map((i) => ({
      variantId: i.variantId,
      qty: i.qty,
      price: i.variant.price,
      packSize: i.variant.packSize,
      title: pick(i.variant.product, 'title', lang),
      slug: i.variant.product.slug,
      image: i.variant.product.images[0]?.url ?? null,
      stock: stock.get(i.variantId) ?? 0,
    }));
    return { items: rows, itemsTotal: rows.reduce((s, r) => s + r.price * r.qty, 0) };
  }

  // qty = 0 bo'lsa mahsulot savatdan olib tashlanadi.
  @Put('cart/items')
  async set(@CurrentUser() user: AuthUser, @Body() dto: CartItemDto) {
    if (dto.qty === 0) {
      await this.prisma.cartItem.deleteMany({ where: { userId: user.id, variantId: dto.variantId } });
      return { ok: true };
    }
    const variant = await this.prisma.productVariant.findFirst({ where: { id: dto.variantId, active: true } });
    if (!variant) throw new NotFoundException();
    await this.prisma.cartItem.upsert({
      where: { userId_variantId: { userId: user.id, variantId: dto.variantId } },
      update: { qty: dto.qty },
      create: { userId: user.id, variantId: dto.variantId, qty: dto.qty },
    });
    return { ok: true };
  }

  @Get('favorites')
  async favorites(@CurrentUser() user: AuthUser) {
    const rows = await this.prisma.favorite.findMany({ where: { userId: user.id }, select: { productId: true } });
    return rows.map((r) => r.productId);
  }

  @Post('favorites/:productId')
  async addFavorite(@CurrentUser() user: AuthUser, @Param('productId', ParseIntPipe) productId: number) {
    await this.prisma.favorite.upsert({
      where: { userId_productId: { userId: user.id, productId } },
      update: {},
      create: { userId: user.id, productId },
    });
    return { ok: true };
  }

  @Delete('favorites/:productId')
  async removeFavorite(@CurrentUser() user: AuthUser, @Param('productId', ParseIntPipe) productId: number) {
    await this.prisma.favorite.deleteMany({ where: { userId: user.id, productId } });
    return { ok: true };
  }

  @Post('addresses')
  addAddress(@CurrentUser() user: AuthUser, @Body() dto: AddressDto) {
    return this.prisma.address.create({ data: { ...dto, userId: user.id }, include: { zone: true } });
  }
}

@Module({ controllers: [CartController] })
export class CartModule {}
