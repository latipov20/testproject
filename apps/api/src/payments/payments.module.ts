import { BadRequestException, Body, Controller, Get, Module, NotFoundException, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsUrl } from 'class-validator';
import { AuthGuard, AuthUser, CurrentUser } from '../common/auth';
import { PrismaService } from '../prisma/prisma.service';
import { ClickController } from './click.controller';
import { PaymeController } from './payme.controller';

class InitDto {
  @IsOptional() @IsUrl({ require_tld: false }) returnUrl?: string;
}

// Kalitlari berilmagan to'lov tizimi taklif qilinmaydi: aks holda buyurtma yaratilib, to'lov sahifasi xato beradi.
const configured = {
  PAYME: () => Boolean(process.env.PAYME_MERCHANT_ID && process.env.PAYME_KEY),
  CLICK: () => Boolean(process.env.CLICK_SERVICE_ID && process.env.CLICK_MERCHANT_ID && process.env.CLICK_SECRET_KEY),
};

export const paymentMethods = () => ['CASH', ...(['PAYME', 'CLICK'] as const).filter((m) => configured[m]())];

@Controller('payments')
class PaymentMethodsController {
  @Get('methods')
  methods() {
    return paymentMethods();
  }
}

@UseGuards(AuthGuard)
@Controller('payments')
class PaymentsController {
  constructor(private readonly prisma: PrismaService) {}

  // To'lov sahifasiga havola qaytaradi.
  @Post(':orderId/init')
  async init(@CurrentUser() user: AuthUser, @Param('orderId', ParseIntPipe) orderId: number, @Body() dto: InitDto) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId: user.id } });
    if (!order) throw new NotFoundException();
    if (order.status === 'CANCELLED') throw new BadRequestException('Buyurtma bekor qilingan');
    if (order.paymentMethod !== 'CASH' && !configured[order.paymentMethod]()) {
      throw new BadRequestException('Onlayn to‘lov hozircha ulanmagan. Kuryerga naqd to‘lashingiz mumkin.');
    }
    const returnUrl = dto.returnUrl ?? `${process.env.WEB_ORIGIN?.split(',')[0]}/orders/${order.id}`;

    if (order.paymentMethod === 'PAYME') {
      const params = `m=${process.env.PAYME_MERCHANT_ID};ac.order_id=${order.id};a=${order.total * 100};c=${returnUrl}`;
      return { url: `${process.env.PAYME_CHECKOUT_URL}/${Buffer.from(params).toString('base64')}` };
    }
    if (order.paymentMethod === 'CLICK') {
      const q = new URLSearchParams({
        service_id: process.env.CLICK_SERVICE_ID ?? '',
        merchant_id: process.env.CLICK_MERCHANT_ID ?? '',
        amount: String(order.total),
        transaction_param: String(order.id),
        return_url: returnUrl,
      });
      return { url: `https://my.click.uz/services/pay?${q}` };
    }
    throw new BadRequestException('Naqd to‘lov uchun havola kerak emas');
  }
}

@Module({ controllers: [PaymentMethodsController, PaymentsController, PaymeController, ClickController] })
export class PaymentsModule {}
