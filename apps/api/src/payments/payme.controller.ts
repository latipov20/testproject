import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Payment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Payme Merchant API (JSON-RPC). Summalar tiyinda keladi: 1 so'm = 100 tiyin.
// Hujjat: https://developer.help.paycom.uz — sandbox'da to'liq sinab ko'rish kerak.
const TIMEOUT_MS = 12 * 60 * 60 * 1000;

class PaymeError {
  constructor(
    readonly code: number,
    readonly message: string,
    readonly data?: string,
  ) {}
}

const ERR = {
  auth: () => new PaymeError(-32504, 'Unauthorized'),
  method: () => new PaymeError(-32601, 'Method not found'),
  amount: () => new PaymeError(-31001, 'Incorrect amount'),
  order: () => new PaymeError(-31050, 'Order not found', 'order_id'),
  busy: () => new PaymeError(-31099, 'Order has another pending transaction', 'order_id'),
  notFound: () => new PaymeError(-31003, 'Transaction not found'),
  cannot: () => new PaymeError(-31008, 'Cannot perform operation'),
  cannotCancel: () => new PaymeError(-31007, 'Order delivered, cannot cancel'),
};

@SkipThrottle()
@Controller('webhooks/payme')
export class PaymeController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @HttpCode(200)
  async handle(@Body() body: { id: number; method: string; params: any }, @Headers('authorization') auth?: string) {
    try {
      this.checkAuth(auth);
      const result = await this.dispatch(body.method, body.params ?? {});
      return { jsonrpc: '2.0', id: body.id, result };
    } catch (e) {
      if (e instanceof PaymeError) {
        return { jsonrpc: '2.0', id: body.id, error: { code: e.code, message: { uz: e.message, ru: e.message, en: e.message }, data: e.data } };
      }
      throw e;
    }
  }

  private checkAuth(header?: string) {
    const expected = 'Basic ' + Buffer.from(`Paycom:${process.env.PAYME_KEY ?? ''}`).toString('base64');
    if (!process.env.PAYME_KEY || header !== expected) throw ERR.auth();
  }

  private dispatch(method: string, p: any) {
    switch (method) {
      case 'CheckPerformTransaction':
        return this.checkPerform(p);
      case 'CreateTransaction':
        return this.create(p);
      case 'PerformTransaction':
        return this.perform(p);
      case 'CancelTransaction':
        return this.cancel(p);
      case 'CheckTransaction':
        return this.check(p);
      case 'GetStatement':
        return this.statement(p);
      default:
        throw ERR.method();
    }
  }

  private async findOrder(p: any) {
    const id = Number(p.account?.order_id);
    const order = Number.isInteger(id) ? await this.prisma.order.findUnique({ where: { id } }) : null;
    if (!order || order.status === 'CANCELLED' || order.paymentMethod !== 'PAYME') throw ERR.order();
    if (order.total * 100 !== Number(p.amount)) throw ERR.amount();
    return order;
  }

  private async checkPerform(p: any) {
    const order = await this.findOrder(p);
    const paid = await this.prisma.payment.findFirst({ where: { orderId: order.id, state: 'PAID' } });
    if (paid) throw ERR.order();
    return { allow: true };
  }

  private async create(p: any) {
    const existing = await this.prisma.payment.findUnique({ where: { provider_providerTxnId: { provider: 'PAYME', providerTxnId: p.id } } });
    if (existing) {
      if (existing.state !== 'PENDING') throw ERR.cannot();
      if (Date.now() - existing.createdAt.getTime() > TIMEOUT_MS) {
        await this.markCancelled(existing, 4);
        throw ERR.cannot();
      }
      return { create_time: existing.createdAt.getTime(), transaction: String(existing.id), state: 1 };
    }
    const order = await this.findOrder(p);
    const other = await this.prisma.payment.findFirst({ where: { orderId: order.id, provider: 'PAYME', state: { in: ['PENDING', 'PAID'] } } });
    if (other) throw ERR.busy();
    const payment = await this.prisma.payment.create({
      data: { orderId: order.id, provider: 'PAYME', providerTxnId: p.id, amount: order.total, raw: { time: p.time } },
    });
    return { create_time: payment.createdAt.getTime(), transaction: String(payment.id), state: 1 };
  }

  private async perform(p: any) {
    const payment = await this.txn(p.id);
    if (payment.state === 'PAID') return { transaction: String(payment.id), perform_time: payment.performedAt!.getTime(), state: 2 };
    if (payment.state !== 'PENDING') throw ERR.cannot();
    if (Date.now() - payment.createdAt.getTime() > TIMEOUT_MS) {
      await this.markCancelled(payment, 4);
      throw ERR.cannot();
    }
    const updated = await this.prisma.payment.update({ where: { id: payment.id }, data: { state: 'PAID', performedAt: new Date() } });
    return { transaction: String(updated.id), perform_time: updated.performedAt!.getTime(), state: 2 };
  }

  private async cancel(p: any) {
    let payment = await this.txn(p.id);
    if (payment.state === 'PAID') {
      const order = await this.prisma.order.findUniqueOrThrow({ where: { id: payment.orderId } });
      if (order.status === 'DELIVERED') throw ERR.cannotCancel();
    }
    if (payment.state === 'PENDING' || payment.state === 'PAID') payment = await this.markCancelled(payment, Number(p.reason));
    return { transaction: String(payment.id), cancel_time: payment.cancelledAt!.getTime(), state: this.state(payment) };
  }

  private async check(p: any) {
    const t = await this.txn(p.id);
    return {
      create_time: t.createdAt.getTime(),
      perform_time: t.performedAt?.getTime() ?? 0,
      cancel_time: t.cancelledAt?.getTime() ?? 0,
      transaction: String(t.id),
      state: this.state(t),
      reason: t.cancelReason ?? null,
    };
  }

  private async statement(p: any) {
    const rows = await this.prisma.payment.findMany({
      where: { provider: 'PAYME', createdAt: { gte: new Date(Number(p.from)), lte: new Date(Number(p.to)) } },
      orderBy: { createdAt: 'asc' },
    });
    return {
      transactions: rows.map((t) => ({
        id: t.providerTxnId,
        time: (t.raw as any)?.time ?? t.createdAt.getTime(),
        amount: t.amount * 100,
        account: { order_id: String(t.orderId) },
        create_time: t.createdAt.getTime(),
        perform_time: t.performedAt?.getTime() ?? 0,
        cancel_time: t.cancelledAt?.getTime() ?? 0,
        transaction: String(t.id),
        state: this.state(t),
        reason: t.cancelReason ?? null,
      })),
    };
  }

  private async txn(id: string) {
    const t = await this.prisma.payment.findUnique({ where: { provider_providerTxnId: { provider: 'PAYME', providerTxnId: id } } });
    if (!t) throw ERR.notFound();
    return t;
  }

  private markCancelled(t: Payment, reason: number) {
    return this.prisma.payment.update({
      where: { id: t.id },
      data: { state: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
    });
  }

  // Payme holatlari: 1 yaratilgan, 2 bajarilgan, -1 bajarilmasdan bekor, -2 bajarilgandan keyin bekor.
  private state(t: Payment) {
    if (t.state === 'PENDING') return 1;
    if (t.state === 'PAID') return 2;
    return t.performedAt ? -2 : -1;
  }
}
