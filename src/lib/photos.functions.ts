import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { PHOTO_MAX_BYTES, PHOTO_MAX_COUNT, PHOTO_TYPES } from './photo-rules';

const BUCKET = 'lead-photos';
const ext: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const leadRef = z.object({ lead_id: z.string().uuid(), whatsapp: z.string().transform(v => v.replace(/\D/g, '')).pipe(z.string().regex(/^\d{11}$/)) });

async function recentLead(leadId: string, whatsapp: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data } = await supabaseAdmin.from('leads').select('id,created_at').eq('id', leadId).eq('whatsapp', whatsapp).maybeSingle();
  if (!data || Date.now() - new Date(data.created_at).getTime() > 30 * 60 * 1000) return null;
  return supabaseAdmin;
}

/** Issues one-time signed upload URLs for a lead created in the last 30 minutes. */
export const requestPhotoUploads = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => leadRef.extend({ files: z.array(z.object({ type: z.enum(PHOTO_TYPES), size: z.number().int().positive().max(PHOTO_MAX_BYTES) })).min(1).max(PHOTO_MAX_COUNT) }).parse(input))
  .handler(async ({ data }) => {
    const admin = await recentLead(data.lead_id, data.whatsapp);
    if (!admin) return { ok: false as const, uploads: [] };
    const { data: existing } = await admin.storage.from(BUCKET).list(data.lead_id, { limit: 20 });
    if ((existing?.length ?? 0) + data.files.length > PHOTO_MAX_COUNT) return { ok: false as const, uploads: [] };
    const uploads: { path: string; token: string }[] = [];
    for (const f of data.files) {
      const path = `${data.lead_id}/${crypto.randomUUID()}.${ext[f.type]}`;
      const { data: signed, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
      if (error || !signed) return { ok: false as const, uploads: [] };
      uploads.push({ path, token: signed.token });
    }
    return { ok: true as const, uploads };
  });

/** Removes any uploaded object whose real type or size breaks the rules. */
export const confirmPhotoUploads = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => leadRef.parse(input))
  .handler(async ({ data }) => {
    const admin = await recentLead(data.lead_id, data.whatsapp);
    if (!admin) return { ok: false as const, count: 0 };
    const { data: files } = await admin.storage.from(BUCKET).list(data.lead_id, { limit: 20, sortBy: { column: 'created_at', order: 'asc' } });
    const list = files ?? [];
    const bad = list.filter((f, i) => i >= PHOTO_MAX_COUNT || !(PHOTO_TYPES as readonly string[]).includes(String(f.metadata?.['mimetype'])) || Number(f.metadata?.['size'] ?? 0) > PHOTO_MAX_BYTES);
    if (bad.length) await admin.storage.from(BUCKET).remove(bad.map(f => `${data.lead_id}/${f.name}`));
    return { ok: true as const, count: list.length - bad.length };
  });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (!data) throw new Error('Seu acesso administrativo ainda não foi autorizado.');
}

/** Short-lived signed URLs, admin only. */
export const listLeadPhotos = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ lead_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: files } = await supabaseAdmin.storage.from(BUCKET).list(data.lead_id, { limit: 10 });
    if (!files?.length) return [];
    const { data: signed } = await supabaseAdmin.storage.from(BUCKET).createSignedUrls(files.map(f => `${data.lead_id}/${f.name}`), 300);
    return (signed ?? []).filter(s => s.signedUrl).map(s => ({ url: s.signedUrl as string }));
  });

/**
 * Grants admin only to the owner: signed in with Google, verified email equal to
 * the server-only ADMIN_OWNER_EMAIL secret. No secret configured = nobody is promoted.
 */
export const claimOwnerAdmin = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const owner = process.env['ADMIN_OWNER_EMAIL']?.trim().toLowerCase();
    if (!owner) return { ok: false as const };
    const { data: { user } } = await context.supabase.auth.getUser();
    if (!user || user.id !== context.userId) return { ok: false as const };
    const viaGoogle = user.app_metadata?.provider === 'google' || (user.identities ?? []).some(i => i.provider === 'google');
    if (!viaGoogle || !user.email_confirmed_at || user.email?.toLowerCase() !== owner) return { ok: false as const };
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: existing } = await supabaseAdmin.from('user_roles').select('id').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!existing) { const { error } = await supabaseAdmin.from('user_roles').insert({ user_id: user.id, role: 'admin' }); if (error) return { ok: false as const }; }
    return { ok: true as const };
  });