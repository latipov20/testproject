import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEYLEN = 64;

// Saqlanadigan ko'rinish: scrypt$<salt hex>$<hash hex>.
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEYLEN);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string | null) {
  const [algo, salt, hash] = stored?.split('$') ?? [];
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const key = await scryptAsync(password, Buffer.from(salt, 'hex'), KEYLEN);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === key.length && timingSafeEqual(expected, key);
}
