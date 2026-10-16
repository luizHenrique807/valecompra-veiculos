import { z } from 'zod';
export const cities = ['São José dos Campos','Jacareí','Caçapava','Taubaté','Outra cidade da região'] as const;
export const statuses = ['Quitado','Financiado em dia','Financiado com parcelas atrasadas','IPVA ou multas em aberto','Outras pendências'] as const;
export const firstStepSchema = z.object({
 full_name: z.string().trim().min(3,'Informe seu nome completo.').max(100).refine(v=>v.split(/\s+/).length>=2,'Informe nome e sobrenome.'),
 whatsapp: z.string().transform(v=>v.replace(/\D/g,'')).refine(v=>/^[1-9]{2}9\d{8}$/.test(v),'Informe um celular válido com DDD e 9 dígitos.'),
 city:z.enum(cities,{errorMap:()=>({message:'Selecione sua cidade.'})}),
 model:z.string().trim().min(2,'Informe marca e modelo.').max(100),
 year:z.coerce.number().int('Informe um ano válido.').min(1980,'O ano mínimo é 1980.').max(new Date().getFullYear()+1,'Informe um ano válido.')
});
export const leadSchema = firstStepSchema.extend({
 id:z.string().uuid(), mileage:z.number().int().min(0).max(9999999).nullable(),
 vehicle_status:z.array(z.enum(statuses)).min(1,'Selecione ao menos uma situação.').max(5),
 notes:z.string().trim().max(1500).nullable(), desired_price:z.number().min(0).max(10000000).nullable(),
 consent:z.literal(true,{errorMap:()=>({message:'Autorize o contato para continuar.'})}), marketing_consent:z.boolean(),
 utm_source:z.string().max(200).nullable(),utm_medium:z.string().max(200).nullable(),utm_campaign:z.string().max(200).nullable(),utm_content:z.string().max(200).nullable(),utm_term:z.string().max(200).nullable(),fbclid:z.string().max(500).nullable(),
 page_url:z.string().url().max(1000).refine(v=>['http:','https:'].includes(new URL(v).protocol)),client_timestamp:z.string().datetime()
});
export type LeadInput = z.infer<typeof leadSchema>;
export function maskPhone(value:string){const v=value.replace(/\D/g,'').slice(0,11);return v.length>7?`(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`:v.length>2?`(${v.slice(0,2)}) ${v.slice(2)}`:v;}