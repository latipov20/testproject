import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, Prisma } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;

// 0/O va 1/I kabi chalkashadigan belgilarsiz: telefonda aytish va qo'lda yozish oson.
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const orderCode = () => Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // Savatdan buyurtma yaratadi. Qoldiq FEFO tartibida yechiladi:
  // avval yaroqlilik muddati eng yaqin partiyadan.
  async createFromCart(userId: number, addressId: number, paymentMethod: PaymentMethod, comment?: string) {
    // Kod takrorlansa (ehtimoli juda kichik) tranzaksiya yangi kod bilan qaytariladi.
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.createOnce(userId, addressId, paymentMethod, orderCode(), comment);
      } catch (e) {
        const codeTaken = e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && String(e.meta?.target).includes('code');
        if (!codeTaken || attempt === 5) throw e;
      }
    }
  }

  private async createOnce(userId: number, addressId: number, paymentMethod: PaymentMethod, code: string, comment?: string) {
    return this.prisma.$transaction(async (tx) => {
      const address = await tx.address.findFirst({ where: { id: addressId, userId }, include: { zone: true } });
      if (!address) throw new NotFoundException('Manzil topilmadi');
      if (!address.zone.active) throw new BadRequestException('Bu hududga yetkazish vaqtincha yo‘q');

      const cart = await tx.cartItem.findMany({ where: { userId }, include: { variant: { include: { product: true } } } });
      if (!cart.length) throw new BadRequestException('Savat bo‘sh');

      const lines: { variantId: number; batchId: number; title: string; price: number; qty: number }[] = [];
      for (const item of cart) {
        const allocations = await this.allocate(tx, item.variantId, item.qty);
        if (!allocations) {
          throw new BadRequestException(`Omborda yetarli emas: ${item.variant.product.titleUz} (${item.variant.packSize})`);
        }
        for (const a of allocations) {
          lines.push({
            variantId: item.variantId,
            batchId: a.batchId,
            title: `${item.variant.product.titleUz} ${item.variant.packSize}`,
            price: item.variant.price,
            qty: a.qty,
          });
        }
      }

      const itemsTotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
      const deliveryFee = address.zone.fee;
      const order = await tx.order.create({
        data: {
          code,
          userId,
          addressId,
          itemsTotal,
          deliveryFee,
          total: itemsTotal + deliveryFee,
          paymentMethod,
          comment,
          items: { create: lines },
        },
        include: { items: true },
        omit: { code: true },
      });

      await tx.stockMovement.createMany({
        data: lines.map((l) => ({ batchId: l.batchId, type: 'SALE' as const, qty: -l.qty, orderId: order.id, userId })),
      });
      await tx.cartItem.deleteMany({ where: { userId } });
      return order;
    });
  }

  // Buyurtmani bekor qiladi va mahsulotni omborga qaytaradi.
  // mode: customer — faqat o'z buyurtmasi, NEW/CONFIRMED; staff — PACKED gacha; returned — kuryer qaytargan buyurtma.
  async cancel(orderId: number, actorId: number, mode: 'customer' | 'staff' | 'returned') {
    const byCustomer = mode === 'customer';
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order || (byCustomer && order.userId !== actorId)) throw new NotFoundException();
      const cancellable: OrderStatus[] =
        mode === 'customer' ? ['NEW', 'CONFIRMED'] : mode === 'staff' ? ['NEW', 'CONFIRMED', 'PACKED'] : ['SHIPPED'];
      if (!cancellable.includes(order.status)) throw new BadRequestException('Bu bosqichda bekor qilib bo‘lmaydi');

      for (const item of order.items) {
        await tx.batch.update({ where: { id: item.batchId }, data: { qty: { increment: item.qty } } });
      }
      await tx.stockMovement.createMany({
        data: order.items.map((i) => ({ batchId: i.batchId, type: 'RETURN' as const, qty: i.qty, orderId, userId: actorId })),
      });
      return tx.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' }, omit: { code: true } });
    });
  }

  // Qatorlarni bloklab (FOR UPDATE) partiyalardan kerakli miqdorni yechadi; yetmasa null qaytaradi.
  private async allocate(tx: Tx, variantId: number, qty: number) {
    const batches = await tx.$queryRaw<{ id: number; qty: number }[]>`
      SELECT id, qty FROM "Batch"
      WHERE "variantId" = ${variantId} AND qty > 0 AND "expiryDate" > CURRENT_DATE
      ORDER BY "expiryDate" ASC, id ASC
      FOR UPDATE`;
    const result: { batchId: number; qty: number }[] = [];
    let left = qty;
    for (const b of batches) {
      if (left === 0) break;
      const take = Math.min(left, b.qty);
      result.push({ batchId: b.id, qty: take });
      left -= take;
    }
    if (left > 0) return null;
    for (const r of result) {
      await tx.batch.update({ where: { id: r.batchId }, data: { qty: { decrement: r.qty } } });
    }
    return result;
  }
}
