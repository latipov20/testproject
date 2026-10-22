import { BadRequestException, Body, Controller, Get, Module, NotFoundException, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { DeliveryStatus } from '@prisma/client';
import { IsIn, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { AuthGuard, AuthUser, CurrentUser, Roles } from '../common/auth';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';

class DeliveryStatusDto {
  @IsIn(['PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'RETURNED']) status: DeliveryStatus;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
  @IsOptional() @IsInt() @Min(0) cashTaken?: number;
}

class DeliveriesQuery {
  @IsOptional() @IsIn(['active', 'delivered']) tab?: 'active' | 'delivered';
}

class CourierStatusDto {
  @IsIn(['ACTIVE', 'OFFLINE']) status: 'ACTIVE' | 'OFFLINE';
}

const ALLOWED: Record<DeliveryStatus, DeliveryStatus[]> = {
  ASSIGNED: ['PICKED_UP'],
  PICKED_UP: ['IN_TRANSIT', 'DELIVERED', 'RETURNED'],
  IN_TRANSIT: ['DELIVERED', 'RETURNED'],
  DELIVERED: [],
  RETURNED: [],
};

@UseGuards(AuthGuard)
@Roles('COURIER')
@Controller('courier')
class CourierController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
  ) {}

  // tab=active: jarayondagilar (eng eskisi birinchi); tab=delivered: topshirilganlar (oxirgi 100 ta, yangisi birinchi).
  @Get('deliveries')
  async list(@CurrentUser() user: AuthUser, @Query() q: DeliveriesQuery) {
    const courier = await this.me(user);
    const delivered = q.tab === 'delivered';
    return this.prisma.delivery.findMany({
      where: { courierId: courier.id, status: delivered ? 'DELIVERED' : { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] } },
      include: {
        order: {
          select: {
            id: true,
            code: true,
            total: true,
            paymentMethod: true,
            comment: true,
            createdAt: true,
            // Qabul qiluvchi: Telegram orqali tasdiqlangan raqam va ism.
            user: { select: { phone: true, name: true, telegramUsername: true } },
            address: { include: { zone: true } },
            items: { select: { title: true, qty: true, variant: { select: { sku: true } } } },
            payments: { where: { state: 'PAID' }, select: { provider: true } },
          },
        },
      },
      orderBy: delivered ? { deliveredAt: 'desc' } : { createdAt: 'asc' },
      take: delivered ? 100 : undefined,
    });
  }

  @Get('me')
  async profile(@CurrentUser() user: AuthUser) {
    const courier = await this.me(user);
    return { id: courier.id, status: courier.status, zoneId: courier.zoneId };
  }

  @Post('status')
  async setStatus(@CurrentUser() user: AuthUser, @Body() dto: CourierStatusDto) {
    const courier = await this.me(user);
    const updated = await this.prisma.courier.update({ where: { id: courier.id }, data: { status: dto.status } });
    return { id: updated.id, status: updated.status };
  }

  @Post('deliveries/:id/status')
  async update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: DeliveryStatusDto) {
    const courier = await this.me(user);
    const delivery = await this.prisma.delivery.findFirst({ where: { id, courierId: courier.id }, include: { order: true } });
    if (!delivery) throw new NotFoundException();
    if (!ALLOWED[delivery.status].includes(dto.status)) throw new BadRequestException(`${delivery.status} -> ${dto.status} mumkin emas`);
    if (dto.status === 'DELIVERED' && delivery.codAmount > 0 && dto.cashTaken !== delivery.codAmount) {
      throw new BadRequestException(`Naqd summa ${delivery.codAmount} so‘m bo‘lishi kerak`);
    }

    if (dto.status === 'RETURNED') await this.orders.cancel(delivery.orderId, user.id, 'returned');

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      if (dto.status === 'PICKED_UP') await tx.order.update({ where: { id: delivery.orderId }, data: { status: 'SHIPPED' } });
      if (dto.status === 'DELIVERED') {
        await tx.order.update({ where: { id: delivery.orderId }, data: { status: 'DELIVERED' } });
        if (delivery.codAmount > 0) {
          await tx.payment.create({
            data: { orderId: delivery.orderId, provider: 'CASH', amount: delivery.codAmount, state: 'PAID', performedAt: now },
          });
        }
      }
      return tx.delivery.update({
        where: { id },
        data: {
          status: dto.status,
          pickedUpAt: dto.status === 'PICKED_UP' ? now : undefined,
          deliveredAt: dto.status === 'DELIVERED' ? now : undefined,
          cashTaken: dto.status === 'DELIVERED' ? (dto.cashTaken ?? 0) : undefined,
          events: { create: { status: dto.status, lat: dto.lat, lng: dto.lng } },
        },
      });
    });
  }

  private async me(user: AuthUser) {
    const courier = await this.prisma.courier.findUnique({ where: { userId: user.id } });
    if (!courier) throw new NotFoundException('Kuryer profili topilmadi');
    return courier;
  }
}

@Module({ controllers: [CourierController] })
export class CourierModule {}
