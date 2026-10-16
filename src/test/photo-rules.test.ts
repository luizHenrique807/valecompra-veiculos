import { describe, it, expect } from 'vitest';
import { checkPhotos, waLink } from '@/lib/photo-rules';
describe('photo rules', () => {
  it('allows up to 5 photos', () => expect(checkPhotos(Array(5).fill({ type: 'image/png', size: 1000 })).ok).toBe(true));
  it('rejects 6 photos', () => expect(checkPhotos(Array(6).fill({ type: 'image/png', size: 1000 })).ok).toBe(false));
  it('rejects non jpeg/png/webp', () => expect(checkPhotos([{ type: 'image/gif', size: 10 }]).ok).toBe(false));
  it('rejects photos above 5 MB', () => expect(checkPhotos([{ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 }]).ok).toBe(false));
  it('builds wa.me link with Brazil code', () => expect(waLink('(12) 99999-0000', 'Ana Souza', 'Onix')).toMatch(/^https:\/\/wa\.me\/5512999990000\?text=Ol/));
});