import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const BUCKET = 'lead-photos';

export const listLeadPhotos = createServerFn({method:'POST'})
 .middleware([requireSupabaseAuth])
 .inputValidator((input:unknown)=>z.object({lead_id:z.string().uuid()}).parse(input))
 .handler(async ({data,context})=>{
  const {data:admin,error:authError}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
  if(authError||!admin)throw new Error('Seu acesso administrativo ainda não foi autorizado.');
  const {data:files,error:listError}=await context.supabase.storage.from(BUCKET).list(data.lead_id,{limit:10});
  if(listError)throw new Error('Não foi possível consultar as fotos.');
  if(!files?.length)return [];
  const {data:signed,error:signError}=await context.supabase.storage.from(BUCKET).createSignedUrls(files.map(f=>`${data.lead_id}/${f.name}`),300);
  if(signError)throw new Error('Não foi possível abrir as fotos.');
  return (signed??[]).filter(s=>s.signedUrl).map(s=>({url:s.signedUrl as string}));
 });

/** Database verifies the authenticated user's confirmed email against the private owner allowlist. */
export const claimOwnerAdmin = createServerFn({method:'POST'})
 .middleware([requireSupabaseAuth])
 .handler(async ({context})=>{
  const {data,error}=await context.supabase.rpc('claim_owner_admin');
  return {ok:!error&&data===true};
 });
