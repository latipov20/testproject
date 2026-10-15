import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

// Click SHOP API: prepare (action=0) va complete (action=1). Summalar so'mda.
// Hujjat: https://docs.click.uz — sandbox'da sinab ko'rish kerak.
const md5 = (s: string) => createHash('md5').update(s).digest('hex');

@SkipThrottle()
@Controller('webhooks/click')
export class ClickController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('prepare')
  @HttpCode(200)
  async prepare(@Body() b: Record<string, string>) {
    const base = { click_trans_id: b.click_trans_id, merchant_trans_id: b.merchant_trans_id };
    const sign = md5(`${b.click_trans_id}${b.service_id}${process.env.CLICK_SECRET_KEY}${b.merchant_trans_id}${b.amount}${b.action}${b.sign_time}`);
    if (sign !== b.sign_string) return { ...base, error: -1, error_note: 'SIGN CHECK FAILED' };
    if (b.action !== '0') return { ...base, error: -3, error_note: 'Action not found' };

    const order = await this.prisma.order.findUnique({ where: { id: Number(b.merchant_trans_id) || 0 } });
    if (!order || order.paymentMethod !== 'CLICK') return { ...base, error: -5, error_note: 'Order not found' };
    if (order.status === 'CANCELLED') return { ...base, error: -9, error_note: 'Transaction cancelled' };
    if (Math.abs(Number(b.amount) - order.total) > 0.01) return { ...base, error: -2, error_note: 'Incorrect amount' };
    const paid = await this.prisma.payment.findFirst({ where: { orderId: order.id, state: 'PAID' } });
    if (paid) return { ...base, error: -4, error_note: 'Already paid' };

    const payment = await this.prisma.payment.upsert({
      where: { provider_providerTxnId: { provider: 'CLICK', providerTxnId: b.click_trans_id } },
      update: {},
      create: { orderId: order.id, provider: 'CLICK', providerTxnId: b.click_trans_id, amount: order.total, raw: b },
    });
    return { ...base, merchant_prepare_id: payment.id, error: 0, error_note: 'Success' };
  }

  @Post('complete')
  @HttpCode(200)
  async complete(@Body() b: Record<string, string>) {
    const base = { click_trans_id: b.click_trans_id, merchant_trans_id: b.merchant_trans_id };
    const sign = md5(
      `${b.click_trans_id}${b.service_id}${process.env.CLICK_SECRET_KEY}${b.merchant_trans_id}${b.merchant_prepare_id}${b.amount}${b.action}${b.sign_time}`,
    );
    if (sign !== b.sign_string) return { ...base, error: -1, error_note: 'SIGN CHECK FAILED' };
    if (b.action !== '1') return { ...base, error: -3, error_note: 'Action not found' };

    const payment = await this.prisma.payment.findUnique({ where: { id: Number(b.merchant_prepare_id) || 0 } });
    if (!payment || payment.providerTxnId !== b.click_trans_id) return { ...base, error: -6, error_note: 'Transaction not found' };
    if (payment.state === 'PAID') return { ...base, merchant_confirm_id: payment.id, error: -4, error_note: 'Already paid' };
    if (payment.state === 'CANCELLED') return { ...base, error: -9, error_note: 'Transaction cancelled' };
    if (Math.abs(Number(b.amount) - payment.amount) > 0.01) return { ...base, error: -2, error_note: 'Incorrect amount' };

    // Click tomonida xato bo'lsa (error < 0), to'lov bekor qilinadi.
    if (Number(b.error) < 0) {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { state: 'CANCELLED', cancelledAt: new Date() } });
      return { ...base, error: -9, error_note: 'Transaction cancelled' };
    }
    await this.prisma.payment.update({ where: { id: payment.id }, data: { state: 'PAID', performedAt: new Date() } });
    return { ...base, merchant_confirm_id: payment.id, error: 0, error_note: 'Success' };
  }
}
