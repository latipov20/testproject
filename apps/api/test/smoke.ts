// To'liq oqimni tekshiradi: xaridor -> buyurtma -> admin -> kuryer -> yetkazildi, hamda Payme JSON-RPC.
// Ishga tushirish: API ishlab turgan bo'lishi kerak (AUTH_DEV_MODE=true, PAYME_KEY va PAYME_MERCHANT_ID o'rnatilgan: aks holda Payme buyurtmasi rad etiladi).
import assert from 'node:assert/strict';

const API = process.env.API_URL ?? 'http://localhost:4000/v1';

async function call(method: string, path: string, body?: unknown, token?: string, headers: Record<string, string> = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json: any = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json)}`);
  return json;
}

// Telegram orqali kirish, bot ulanmagan sinov rejimida (API: AUTH_DEV_MODE=true, TELEGRAM_BOT_TOKEN bo'sh).
async function login(phone: string) {
  const { token } = await call('POST', '/auth/telegram/start');
  const { devCode } = await call('POST', '/auth/telegram/dev-contact', { token, phone });
  const { accessToken } = await call('POST', '/auth/telegram/verify', { token, code: devCode });
  return accessToken as string;
}

async function main() {
  const phone = `+99891${String(Date.now()).slice(-7)}`;
  const customer = await login(phone);
  const admin = await login('+998900000001');
  const courier = await login('+998900000003');

  // Katalog
  const list = await call('GET', '/products?animal=qoramol&sort=price_asc');
  assert.ok(list.items.length > 0, 'katalog bo‘sh');
  const ru = await call('GET', '/products/multivitamin-kompleksi', undefined, undefined, { 'accept-language': 'ru' });
  assert.match(ru.title, /Мультивитамин/);
  const variant = ru.variants[0];
  const stockBefore = variant.stock;

  // Savat va manzil
  await call('PUT', '/cart/items', { variantId: variant.id, qty: 12 }, customer);
  const cart = await call('GET', '/cart', undefined, customer);
  assert.equal(cart.itemsTotal, variant.price * 12);
  const address = await call('POST', '/addresses', { zoneId: 1, street: 'Chilonzor 1-kvartal, 5-uy' }, customer);

  // Buyurtma: 12 dona -> B1 partiyadan (10, muddati yaqin) va B2 dan (2). FEFO.
  const order = await call('POST', '/orders', { addressId: address.id, paymentMethod: 'CASH' }, customer);
  assert.equal(order.total, variant.price * 12 + 20000);
  assert.equal(order.code, undefined, 'buyurtma kodi xaridorga ko‘rinmasligi kerak');
  const batches = await call('GET', `/staff/batches?variantId=${variant.id}`, undefined, admin);
  const used = order.items.map((i: any) => [batches.find((b: any) => b.id === i.batchId).batchNo, i.qty]);
  console.log('FEFO taqsimot:', used);
  assert.equal(order.items[0].qty <= 10, true);
  const after = await call('GET', '/products/multivitamin-kompleksi');
  assert.equal(after.variants[0].stock, stockBefore - 12);

  // Admin: tasdiqlash, yig'ish, kuryerga biriktirish
  await call('POST', `/staff/orders/${order.id}/status`, { status: 'CONFIRMED' }, admin);
  await call('POST', `/staff/orders/${order.id}/status`, { status: 'PACKED' }, admin);
  const couriers = await call('GET', '/staff/couriers', undefined, admin);
  const delivery = await call('POST', `/staff/orders/${order.id}/assign-courier`, { courierId: couriers[0].id }, admin);
  assert.equal(delivery.codAmount, order.total);

  // Kuryer: olish va topshirish (naqd)
  const mine = await call('GET', '/courier/deliveries', undefined, courier);
  const assigned = mine.find((d: any) => d.id === delivery.id);
  assert.match(assigned.order.code, /^[2-9A-HJ-NP-Z]{8}$/);
  assert.ok(assigned.order.items.every((i: any) => i.variant.sku));
  await call('POST', `/courier/deliveries/${delivery.id}/status`, { status: 'PICKED_UP' }, courier);
  await call('POST', `/courier/deliveries/${delivery.id}/status`, { status: 'DELIVERED', cashTaken: order.total }, courier);
  const delivered = await call('GET', '/courier/deliveries?tab=delivered', undefined, courier);
  assert.ok(delivered.some((d: any) => d.id === delivery.id), 'topshirilgan buyurtma "Yetkazilgan" bo‘limida');
  const done = await call('GET', `/orders/${order.id}`, undefined, customer);
  assert.equal(done.status, 'DELIVERED');
  assert.equal(done.code, undefined);
  const found = await call('GET', `/staff/orders?code=${assigned.order.code.toLowerCase()}`, undefined, admin);
  assert.deepEqual(found.map((o: any) => o.id), [order.id]);
  assert.equal(done.payments[0].state, 'PAID');

  // Bekor qilish omborga qaytaradi
  await call('PUT', '/cart/items', { variantId: variant.id, qty: 3 }, customer);
  const o2 = await call('POST', '/orders', { addressId: address.id, paymentMethod: 'PAYME' }, customer);
  const mid = (await call('GET', '/products/multivitamin-kompleksi')).variants[0].stock;

  // Payme JSON-RPC
  const auth = 'Basic ' + Buffer.from(`Paycom:${process.env.PAYME_KEY}`).toString('base64');
  const rpc = (method: string, params: object) =>
    fetch(API + '/webhooks/payme', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: auth },
      body: JSON.stringify({ id: 1, method, params }),
    }).then((r) => r.json() as any);
  const account = { order_id: String(o2.id) };
  assert.equal((await rpc('CheckPerformTransaction', { amount: o2.total * 100 + 1, account })).error.code, -31001);
  assert.equal((await rpc('CheckPerformTransaction', { amount: o2.total * 100, account })).result.allow, true);
  const txId = `test-${Date.now()}`;
  assert.equal((await rpc('CreateTransaction', { id: txId, time: Date.now(), amount: o2.total * 100, account })).result.state, 1);
  assert.equal((await rpc('PerformTransaction', { id: txId })).result.state, 2);
  assert.equal((await rpc('CheckTransaction', { id: txId })).result.state, 2);
  const badAuth = await fetch(API + '/webhooks/payme', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 1, method: 'CheckTransaction', params: { id: txId } }),
  }).then((r) => r.json() as any);
  assert.equal(badAuth.error.code, -32504);

  await call('POST', `/orders/${o2.id}/cancel`, undefined, customer);
  const restored = (await call('GET', '/products/multivitamin-kompleksi')).variants[0].stock;
  assert.equal(restored, mid + 3);

  // Ruxsatlar: xaridor admin API'siga kira olmaydi
  await assert.rejects(call('GET', '/staff/orders', undefined, customer), /403/);

  console.log('Smoke test: hammasi o‘tdi');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
