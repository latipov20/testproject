import { BadRequestException, Body, Controller, Module, NotFoundException, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsUrl } from 'class-validator';
import { AuthGuard, AuthUser, CurrentUser } from '../common/auth';
import { PrismaService } from '../prisma/prisma.service';
import { ClickController } from './click.controller';
import { PaymeController } from './payme.controller';

class InitDto {
  @IsOptional() @IsUrl({ require_tld: false }) returnUrl?: string;
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

@Module({ controllers: [PaymentsController, PaymeController, ClickController] })
export class PaymentsModule {}
