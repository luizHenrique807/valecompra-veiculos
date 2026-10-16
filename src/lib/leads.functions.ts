import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { leadSchema } from './lead-schema';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
export const submitLead = createServerFn({method:'POST'}).inputValidator((input:unknown)=>leadSchema.parse(input)).handler(async({data})=>{
 const { createClient } = await import('@supabase/supabase-js');
 const url=process.env['SUPABASE_URL'],publishableKey=process.env['SUPABASE_PUBLISHABLE_KEY'];
 if(!url||!publishableKey)return {ok:false as const,message:'Cadastro indisponível: conexão com banco não configurada.'};
 const publicClient=createClient(url,publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const request=getRequest();
 const ip=request.headers.get('cf-connecting-ip') || request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip));
 const key=Array.from(new Uint8Array(bytes)).map(v=>v.toString(16).padStart(2,'0')).join('');
 const {data:allowed,error:limitError}=await publicClient.rpc('consume_lead_limit',{_key:key});
 if(limitError || !allowed)return {ok:false as const,message:'Não foi possível enviar agora. Aguarde e tente novamente.'};
 const { error }=await publicClient.from('leads').insert({...data});
 if(error){
  if(error.code==='23505')return {ok:true as const};
  return {ok:false as const,message:'Não foi possível confirmar o envio. Seus dados continuam aqui; tente novamente mais tarde.'};
 }
 return {ok:true as const};
});
export const listLeads = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({city:z.string().max(80),status:z.string().max(100),date:z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/)}).parse(input)).handler(async({data,context})=>{
 const {data:admin}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
 if(!admin) throw new Error('Seu acesso administrativo ainda não foi autorizado.');
 let query=context.supabase.from('leads').select('*').order('created_at',{ascending:false}).limit(200);
 if(data.city)query=query.eq('city',data.city);
 if(data.status)query=query.contains('vehicle_status',[data.status]);
 if(data.date)query=query.gte('created_at',`${data.date}T00:00:00-03:00`).lt('created_at',new Date(new Date(`${data.date}T00:00:00-03:00`).getTime()+86400000).toISOString());
 const {data:leads,error}=await query;if(error)throw new Error('Não foi possível carregar as solicitações.');return leads;
});