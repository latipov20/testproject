import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { AuthGuard, AuthUser, CurrentUser, Roles } from '../common/auth';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';

class OrdersQuery {
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
}

class StatusDto {
  @IsIn(['CONFIRMED', 'PACKED']) status: 'CONFIRMED' | 'PACKED';
}

class AssignDto {
  @IsInt() courierId: number;
}

class ReceiptDto {
  @IsInt() variantId: number;
  @IsString() @MaxLength(60) batchNo: string;
  @IsDateString() expiryDate: string;
  @IsInt() @Min(1) qty: number;
  @IsOptional() @IsInt() @Min(0) purchasePrice?: number;
}

class WriteOffDto {
  @IsInt() @Min(1) qty: number;
  @IsString() @MaxLength(200) reason: string;
}

class ExpiringQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365) days?: number;
}

// Buyurtma holati faqat oldinga siljiydi: NEW -> CONFIRMED -> PACKED.
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = { NEW: 'CONFIRMED', CONFIRMED: 'PACKED' };

@UseGuards(AuthGuard)
@Roles('OPERATOR', 'ADMIN')
@Controller('staff')
class StaffController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
  ) {}

  @Get('orders')
  list(@Query() q: OrdersQuery) {
    return this.prisma.order.findMany({
      where: q.status ? { status: q.status } : {},
      include: {
        user: { select: { phone: true, name: true } },
        address: { include: { zone: true } },
        items: { include: { batch: { select: { batchNo: true, expiryDate: true } } } },
        payments: { select: { provider: true, state: true, amount: true } },
        delivery: { include: { courier: { include: { user: { select: { phone: true, name: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  @Post('orders/:id/status')
  async setStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: StatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException();
    if (NEXT[order.status] !== dto.status) throw new BadRequestException(`${order.status} -> ${dto.status} mumkin emas`);
    return this.prisma.order.update({ where: { id }, data: { status: dto.status } });
  }

  @Post('orders/:id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.orders.cancel(id, user.id, 'staff');
  }

  // Yig'ilgan (PACKED) buyurtmani kuryerga biriktiradi. Naqd to'lovda kuryer butun summani oladi.
  @Post('orders/:id/assign-courier')
  async assign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignDto) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { delivery: true } });
    if (!order) throw new NotFoundException();
    if (order.status !== 'PACKED') throw new BadRequestException('Avval buyurtmani yig‘ing (PACKED)');
    if (order.delivery) throw new BadRequestException('Kuryer allaqachon biriktirilgan');
    const courier = await this.prisma.courier.findUnique({ where: { id: dto.courierId } });
    if (!courier) throw new NotFoundException('Kuryer topilmadi');
    return this.prisma.delivery.create({
      data: {
        orderId: id,
        courierId: courier.id,
        fee: order.deliveryFee,
        codAmount: order.paymentMethod === 'CASH' ? order.total : 0,
        events: { create: { status: 'ASSIGNED' } },
      },
    });
  }

  @Get('couriers')
  couriers() {
    return this.prisma.courier.findMany({
      include: { user: { select: { phone: true, name: true } }, zone: true, _count: { select: { deliveries: { where: { status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] } } } } } },
    });
  }

  @Get('batches')
  batches(@Query('variantId') variantId?: string) {
    return this.prisma.batch.findMany({
      where: variantId ? { variantId: Number(variantId) } : { qty: { gt: 0 } },
      include: { variant: { include: { product: { select: { titleUz: true } } } } },
      orderBy: { expiryDate: 'asc' },
    });
  }

  // Kirim: yangi partiya omborga qabul qilinadi.
  @Post('batches')
  async receive(@CurrentUser() user: AuthUser, @Body() dto: ReceiptDto) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: dto.variantId } });
    if (!variant) throw new NotFoundException('Variant topilmadi');
    return this.prisma.batch.create({
      data: {
        variantId: dto.variantId,
        batchNo: dto.batchNo,
        expiryDate: new Date(dto.expiryDate),
        qty: dto.qty,
        purchasePrice: dto.purchasePrice ?? 0,
        movements: { create: { type: 'RECEIPT', qty: dto.qty, userId: user.id } },
      },
    });
  }

  @Post('batches/:id/write-off')
  async writeOff(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: WriteOffDto) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({ where: { id } });
      if (!batch) throw new NotFoundException();
      if (batch.qty < dto.qty) throw new BadRequestException('Partiyada buncha mahsulot yo‘q');
      await tx.stockMovement.create({ data: { batchId: id, type: 'WRITE_OFF', qty: -dto.qty, reason: dto.reason, userId: user.id } });
      return tx.batch.update({ where: { id }, data: { qty: { decrement: dto.qty } } });
    });
  }

  // Muddati yaqin (yoki o'tgan) va hali qoldig'i bor partiyalar.
  @Get('expiring')
  expiring(@Query() q: ExpiringQuery) {
    const until = new Date(Date.now() + (q.days ?? 60) * 86_400_000);
    return this.prisma.batch.findMany({
      where: { qty: { gt: 0 }, expiryDate: { lte: until } },
      include: { variant: { include: { product: { select: { titleUz: true, slug: true } } } } },
      orderBy: { expiryDate: 'asc' },
    });
  }
}

@Module({ controllers: [StaffController] })
export class StaffModule {}
