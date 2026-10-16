export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_MAX_COUNT = 5;
export type PhotoCheck = { ok: true } | { ok: false; message: string };
export function checkPhotos(files: { type: string; size: number }[]): PhotoCheck {
  if (files.length > PHOTO_MAX_COUNT) return { ok: false, message: 'Envie no máximo 5 fotos.' };
  if (files.some(f => !(PHOTO_TYPES as readonly string[]).includes(f.type))) return { ok: false, message: 'Use fotos JPG, PNG ou WEBP.' };
  if (files.some(f => f.size > PHOTO_MAX_BYTES)) return { ok: false, message: 'Cada foto deve ter até 5 MB.' };
  return { ok: true };
}
export function waLink(whatsapp: string, name: string, model: string) {
  const digits = whatsapp.replace(/\D/g, '');
  const text = `Olá, ${name.split(' ')[0]}! Aqui é da ValeCompra Veículos. Recebemos sua solicitação de avaliação do ${model}. Podemos conversar?`;
  return `https://wa.me/55${digits}?text=${encodeURIComponent(text)}`;
}