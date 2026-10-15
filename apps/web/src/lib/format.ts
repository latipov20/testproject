export const price = (n: number, sum: string) => `${n.toLocaleString('ru-RU').replace(/[\s,]/g, ' ')} ${sum}`;

// Sana Toshkent vaqti (UTC+5) bo'yicha, dd.mm.yyyy: server va brauzerda bir xil chiqadi.
export const date = (d: string | Date, _locale?: string) => {
  const t = new Date(new Date(d).getTime() + 5 * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(t.getUTCDate())}.${pad(t.getUTCMonth() + 1)}.${t.getUTCFullYear()}`;
};
