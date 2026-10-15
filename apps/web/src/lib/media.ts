// Admin yuklagan rasmlar API serverida turadi (/uploads/...). Tashqi URL o'zgarishsiz qaytadi.
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1').replace(/\/v1\/?$/, '');

export const mediaUrl = (url: string) => (url.startsWith('/uploads/') ? API_ORIGIN + url : url);
