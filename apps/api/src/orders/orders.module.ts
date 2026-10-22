import { BadRequestException, Body, Controller, Get, Global, Module, NotFoundException, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { AuthGuard, AuthUser, CurrentUser } from '../common/auth';
import { paymentMethods } from '../payments/payments.module';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from './orders.service';

class CreateOrderDto {
  @IsInt() addressId: number;
  @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;
  @IsOptional() @IsString() @MaxLength(500) comment?: string;
}

@UseGuards(AuthGuard)
@Controller('orders')
class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    if (!paymentMethods().includes(dto.paymentMethod)) throw new BadRequestException('Bu to‘lov usuli hozircha ulanmagan');
    return this.orders.createFromCart(user.id, dto.addressId, dto.paymentMethod, dto.comment);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.prisma.order.findMany({
      where: { userId: user.id },
      include: { items: true, delivery: { select: { status: true } } },
      omit: { code: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId: user.id },
      include: { items: true, address: { include: { zone: true } }, payments: true, delivery: { include: { events: true } } },
      omit: { code: true },
    });
    if (!order) throw new NotFoundException();
    return order;
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.orders.cancel(id, user.id, 'customer');
  }
}

@Global()
@Module({ controllers: [OrdersController], providers: [OrdersService], exports: [OrdersService] })
export class OrdersModule {}
