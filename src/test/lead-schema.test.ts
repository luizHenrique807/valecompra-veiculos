import { describe,expect,it } from 'vitest';
import { firstStepSchema,leadSchema,maskPhone } from '@/lib/lead-schema';
const first={full_name:'Maria Silva',whatsapp:'(12) 99999-1234',city:'Jacareí',model:'Chevrolet Onix',year:2018};
const lead={...first,id:'11111111-1111-4111-8111-111111111111',mileage:null,vehicle_status:['Financiado com parcelas atrasadas','IPVA ou multas em aberto'],notes:null,desired_price:null,consent:true,marketing_consent:false,utm_source:null,utm_medium:null,utm_campaign:null,utm_content:null,utm_term:null,fbclid:null,page_url:'https://example.com/',client_timestamp:'2026-10-14T04:34:00.000Z'};
describe('Regras da avaliação',()=>{
 it('aceita celular formatado ou apenas dígitos e normaliza para armazenamento',()=>{expect(firstStepSchema.parse(first).whatsapp).toBe('12999991234');expect(firstStepSchema.parse({...first,whatsapp:'12999991234'}).whatsapp).toBe('12999991234')});
 it('rejeita celular curto, fixo ou longo',()=>{for(const whatsapp of ['1299991234','1233331234','129999912345'])expect(firstStepSchema.safeParse({...first,whatsapp}).success).toBe(false)});
 it('limita a máscara a onze dígitos',()=>{expect(maskPhone('1299999123456')).toBe('(12) 99999-1234')});
 it('aceita ano 1980 e rejeita 1979',()=>{expect(firstStepSchema.safeParse({...first,year:1980}).success).toBe(true);expect(firstStepSchema.safeParse({...first,year:1979}).success).toBe(false)});
 it('aceita ano corrente mais um e rejeita o seguinte',()=>{const year=new Date().getFullYear();expect(firstStepSchema.safeParse({...first,year:year+1}).success).toBe(true);expect(firstStepSchema.safeParse({...first,year:year+2}).success).toBe(false)});
 it('exige celular brasileiro com DDD',()=>{expect(firstStepSchema.safeParse(first).success).toBe(true);expect(firstStepSchema.safeParse({...first,whatsapp:'99999-1234'}).success).toBe(false)});
 it('exige consentimento LGPD',()=>{expect(leadSchema.safeParse(lead).success).toBe(true);expect(leadSchema.safeParse({...lead,consent:false}).success).toBe(false)});
 it('permite situações mistas e exige ao menos uma',()=>{expect(leadSchema.safeParse(lead).success).toBe(true);expect(leadSchema.safeParse({...lead,vehicle_status:[]}).success).toBe(false)});
 it('aceita as quatro cidades e outra da região',()=>{for(const city of ['São José dos Campos','Jacareí','Caçapava','Taubaté','Outra cidade da região'])expect(firstStepSchema.safeParse({...first,city}).success).toBe(true);expect(firstStepSchema.safeParse({...first,city:'São Paulo'}).success).toBe(false)});
});