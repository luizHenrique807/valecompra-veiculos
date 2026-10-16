import { useRef, useState, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { ArrowRight, ArrowLeft, CheckCircle2, Loader2, LockKeyhole, CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cities, statuses, firstStepSchema, leadSchema, maskPhone } from '@/lib/lead-schema';
import { submitLead } from '@/lib/leads.functions';
import { checkPhotos } from '@/lib/photo-rules';
import { supabase } from '@/integrations/supabase/client';
import { trackLead } from './pixel';

export function LeadForm() {
 const [step, setStep] = useState(1);
 const [busy, setBusy] = useState(false);
 const [success, setSuccess] = useState(false);
 const [errors, setErrors] = useState<Record<string, string>>({});
 const [failure, setFailure] = useState('');
 const [values, setValues] = useState({ full_name: '', whatsapp: '', city: '', model: '', year: '', mileage: '', notes: '', desired_price: '' });
 const [selected, setSelected] = useState<string[]>([]);
 const [consent, setConsent] = useState(false);
 const id = useRef('');
 const sending = useRef(false);
 const formSection = useRef<HTMLElement>(null);
 const stepTitle = useRef<HTMLDivElement>(null);
 const successPanel = useRef<HTMLDivElement>(null);
 const send = useServerFn(submitLead);
 const [photos, setPhotos] = useState<File[]>([]);
 const [photoNote, setPhotoNote] = useState('');
 function pickPhotos(list: FileList | null) {
  const next = [...photos, ...Array.from(list ?? [])];
  const check = checkPhotos(next);
  if (!check.ok) { setErrors(e => ({ ...e, photos: check.message })); return; }
  setErrors(({ photos: _p, ...rest }) => rest); setPhotos(next);
 }
 const set = (key: keyof typeof values, value: string) => setValues(v => ({ ...v, [key]: value }));
 function validationErrors(issues: { path: (string | number)[]; message: string }[]) {
  const next = issues.reduce<Record<string, string>>((acc, issue) => { const key = String(issue.path[0]); if (!acc[key]) acc[key] = issue.message; return acc; }, {});
  setErrors(next);
  requestAnimationFrame(() => formSection.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
 }
 function changeStep(next: number) {
  setStep(next); setErrors({}); setFailure('');
  requestAnimationFrame(() => { stepTitle.current?.focus({ preventScroll: true }); stepTitle.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); });
 }
 async function submit(event: FormEvent) {
  event.preventDefault();
  if (sending.current) return;
  setFailure(''); setErrors({});
  if (step === 1) {
   const result = firstStepSchema.safeParse(values);
   if (!result.success) { validationErrors(result.error.issues); return; }
   changeStep(2); return;
  }
  if (!id.current) id.current = crypto.randomUUID();
  const url = new URL(window.location.href);
  const attribution = (key: string, max = 200) => url.searchParams.get(key)?.slice(0, max) || null;
  const result = leadSchema.safeParse({ ...values, id: id.current, mileage: values.mileage ? Number(values.mileage) : null, desired_price: values.desired_price ? Number(values.desired_price.replace(',', '.')) : null, notes: values.notes || null, vehicle_status: selected, consent, marketing_consent: sessionStorage.getItem('vc_marketing') === 'accepted', utm_source: attribution('utm_source'), utm_medium: attribution('utm_medium'), utm_campaign: attribution('utm_campaign'), utm_content: attribution('utm_content'), utm_term: attribution('utm_term'), fbclid: attribution('fbclid', 500), page_url: `${url.origin}${url.pathname}`, client_timestamp: new Date().toISOString() });
  if (!result.success) { validationErrors(result.error.issues); return; }
  sending.current = true; setBusy(true);
  try {
   const response = await send({ data: result.data });
   if (response.ok) {
    if (photos.length) {
     try {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(result.data.whatsapp));
      const proof = Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');
      const extension:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
      const uploads = await Promise.all(photos.map(photo=>{
       const path=`${result.data.id}/${proof}-${crypto.randomUUID()}.${extension[photo.type]}`;
       return supabase.storage.from('lead-photos').upload(path,photo,{contentType:photo.type,upsert:false});
      }));
      if (uploads.some(u=>u.error)) setPhotoNote('Sua solicitação foi recebida, mas nem todas as fotos foram enviadas. Você poderá enviá-las durante o contato.');
     } catch { setPhotoNote('Sua solicitação foi recebida, mas as fotos não puderam ser enviadas. Você poderá enviá-las durante o contato.'); }
    }
    setSuccess(true);
    requestAnimationFrame(() => { successPanel.current?.focus({ preventScroll: true }); formSection.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); });
    try { trackLead(); } catch { /* Tracking never changes submission success. */ }
   } else setFailure(response.message);
  } catch { setFailure('Não conseguimos confirmar o envio. Seus dados foram mantidos nesta página. Verifique a conexão e tente novamente.'); }
  finally { sending.current = false; setBusy(false); }
 }
 function field(key: keyof typeof values, label: string, placeholder: string, type = 'text', optional = false) {
  return <div className="field"><label htmlFor={key}>{label}{optional && <span className="font-normal text-paper-muted"> · opcional</span>}</label><input id={key} name={key} type={type} value={values[key]} placeholder={placeholder} required={!optional} autoComplete={key === 'full_name' ? 'name' : key === 'whatsapp' ? 'tel' : 'off'} inputMode={type === 'number' ? key === 'desired_price' ? 'decimal' : 'numeric' : key === 'whatsapp' ? 'tel' : undefined} maxLength={key === 'full_name' || key === 'model' ? 100 : key === 'whatsapp' ? 16 : undefined} min={key === 'year' ? 1980 : 0} max={key === 'year' ? new Date().getFullYear() + 1 : key === 'mileage' ? 9999999 : 10000000} step={key === 'desired_price' ? '0.01' : type === 'number' ? '1' : undefined} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${key}-error` : key === 'whatsapp' ? 'phone-hint' : undefined} onChange={e => set(key, key === 'whatsapp' ? maskPhone(e.target.value) : e.target.value)} />{key === 'whatsapp' && <p id="phone-hint" className="form-subtitle">Se a avaliação avançar, nossa equipe inicia o contato por este WhatsApp.</p>}{errors[key] && <p id={`${key}-error`} className="field-error">{errors[key]}</p>}</div>;
 }
 return <section ref={formSection} className="lead-form" id="avaliacao" aria-label="Solicitar avaliação do veículo">
  {success ? <div ref={successPanel} tabIndex={-1} className="form-success" role="status"><CheckCircle2 size={48} aria-hidden="true" /><h2>Solicitação recebida.</h2><p>Seus dados foram enviados para análise. O contato será pelo WhatsApp informado.</p>{photoNote && <p>{photoNote}</p>}<p>A avaliação é gratuita e não obriga você a vender. Proposta e compra dependem da análise.</p></div> : <>
   <div className="form-eyebrow"><CircleCheck size={15} aria-hidden="true" /> AVALIAÇÃO GRATUITA · SEM COMPROMISSO</div>
   <h2>Seu carro pode entrar numa negociação?</h2><p className="form-subtitle">Conte sobre ele em 2 etapas. Não pedimos placa, CPF ou dados bancários neste primeiro contato.</p>
   <div ref={stepTitle} tabIndex={-1} className="step-row step-title" aria-live="polite"><span>Etapa {step} de 2</span><span>{step === 1 ? 'Seus dados e seu carro' : 'Situação do veículo'}</span></div>
   <div className="progress-track" role="progressbar" aria-label="Progresso da avaliação" aria-valuemin={1} aria-valuemax={2} aria-valuenow={step}><span className="active" /><span className={step === 2 ? 'active' : ''} /></div>
   <form noValidate onSubmit={submit} aria-busy={busy}><fieldset className="form-fields" disabled={busy}>
    {step === 1 ? <>
     {field('full_name', 'Nome completo', 'Seu nome e sobrenome')}{field('whatsapp', 'WhatsApp', '(12) 99999-9999', 'tel')}
     <div className="field"><label htmlFor="city">Cidade</label><select id="city" required value={values.city} onChange={e => set('city', e.target.value)} aria-invalid={!!errors['city']} aria-describedby={errors['city'] ? 'city-error' : undefined}><option value="">Selecione sua cidade</option>{cities.map(c => <option key={c}>{c}</option>)}</select>{errors['city'] && <p id="city-error" className="field-error">{errors['city']}</p>}</div>
     <div className="field-grid">{field('model', 'Marca e modelo', 'Ex.: Onix 1.0')}{field('year', 'Ano', 'Ex.: 2018', 'number')}</div>
     <Button type="submit" size="lg" className="form-submit mt-6 font-bold">Continuar: situação do carro <ArrowRight /></Button>
     <p className="form-note"><LockKeyhole size={13} aria-hidden="true" /> Seus dados são usados para analisar o carro e entrar em contato.</p>
    </> : <>
     {field('mileage', 'Quilometragem aproximada', 'Ex.: 80000', 'number', true)}
     <fieldset className="field" aria-describedby={errors['vehicle_status'] ? 'status-error' : undefined}><legend className="font-bold mb-2">Situação do veículo <span className="font-normal">(selecione uma ou mais)</span></legend><div className="status-list">{statuses.map((status, i) => <label key={status} className="check-label"><input type="checkbox" checked={selected.includes(status)} aria-invalid={!!errors['vehicle_status']} aria-describedby={errors['vehicle_status'] ? 'status-error' : undefined} id={`status-${i}`} onChange={e => setSelected(v => e.target.checked ? [...v, status] : v.filter(s => s !== status))} />{status}</label>)}</div>{errors['vehicle_status'] && <p id="status-error" className="field-error">{errors['vehicle_status']}</p>}</fieldset>
     <div className="field"><label htmlFor="notes">Conte sobre a situação <span className="font-normal text-paper-muted">· opcional</span></label><textarea id="notes" maxLength={1500} placeholder="Condições do carro ou pendências. Não envie documentos ou dados bancários." value={values.notes} aria-invalid={!!errors['notes']} aria-describedby={errors['notes'] ? 'notes-error' : undefined} onChange={e => set('notes', e.target.value)} />{errors['notes'] && <p id="notes-error" className="field-error">{errors['notes']}</p>}</div>
     <div className="field"><label htmlFor="photos">Fotos do veículo <span className="font-normal text-paper-muted">· opcional, até 5 (JPG, PNG ou WEBP, até 5 MB cada)</span></label><input id="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple aria-invalid={!!errors['photos']} aria-describedby="photos-hint" onChange={e => { pickPhotos(e.target.files); e.target.value = ''; }} /><p id="photos-hint" className="form-subtitle">As fotos ficam privadas e são vistas apenas pela equipe de avaliação. Evite fotografar documentos ou a placa.</p>{photos.length > 0 && <ul className="form-subtitle">{photos.map((p, i) => <li key={i} className="flex justify-between gap-2"><span className="truncate">{p.name}</span><button type="button" className="underline" onClick={() => setPhotos(v => v.filter((_, j) => j !== i))} aria-label={`Remover ${p.name}`}>Remover</button></li>)}</ul>}{errors['photos'] && <p id="photos-error" className="field-error" role="alert">{errors['photos']}</p>}</div>
     {field('desired_price', 'Valor pretendido (R$)', 'Ex.: 35000', 'number', true)}
     <p className="form-subtitle">O valor informado não garante uma proposta. Veículo, débitos e documentos são analisados individualmente.</p>
     <label className="check-label consent"><input type="checkbox" required checked={consent} aria-invalid={!!errors['consent']} aria-describedby={errors['consent'] ? 'consent-error' : undefined} onChange={e => setConsent(e.target.checked)} /><span>Autorizo o contato da ValeCompra Veículos para avaliação do meu veículo e entendo a <Link to="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade</Link>.</span></label>{errors['consent'] && <p id="consent-error" className="field-error">{errors['consent']}</p>}
     <Button type="submit" size="lg" className="form-submit mt-5 font-bold">{busy ? <><Loader2 className="animate-spin" /> Enviando solicitação...</> : <>Enviar meu carro para análise <ArrowRight /></>}</Button>
     <Button type="button" variant="link" size="sm" className="form-back mt-2 text-ink" onClick={() => changeStep(1)}><ArrowLeft /> Voltar e revisar dados</Button>
    </>}
   </fieldset>{busy && <p className="form-subtitle" role="status">Confirmando o envio. Aguarde sem fechar esta página.</p>}{failure && <p className="field-error mt-4" role="alert">{failure}</p>}</form>
  </>}
 </section>;
}