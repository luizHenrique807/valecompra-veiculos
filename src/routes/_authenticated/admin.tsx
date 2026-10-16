import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CalendarDays,
  Camera,
  CarFront,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  FileText,
  Gauge,
  LogOut,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
  X,
} from 'lucide-react';
import { listLeads } from '@/lib/leads.functions';
import { cities, statuses } from '@/lib/lead-schema';
import type { Database } from '@/integrations/supabase/types';
import { Brand } from '@/components/valecompra/brand';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { listLeadPhotos, claimOwnerAdmin } from '@/lib/photos.functions';
import { waLink } from '@/lib/photo-rules';

type Lead = Database['public']['Tables']['leads']['Row'];

const numberFormat = new Intl.NumberFormat('pt-BR');
const currencyFormat = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 11
    ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    : phone;
}

function statusVariant(status: string) {
  const normalized = status.toLocaleLowerCase('pt-BR');
  if (normalized.includes('atrasad') || normalized.includes('multas')) return 'attention';
  if (normalized === 'quitado' || normalized.includes('em dia')) return 'positive';
  return 'neutral';
}

function AdminPhotos({ leadId }: { leadId: string }) {
  const list = useServerFn(listLeadPhotos);
  const photos = useQuery({
    queryKey: ['valecompra-admin-photos', leadId],
    queryFn: () => list({ data: { lead_id: leadId } }),
    staleTime: 4 * 60 * 1000, // signed URLs expire after five minutes
    retry: false,
  });

  return (
    <section className="vc-admin-gallery" aria-label="Fotografias do veículo">
      <div className="vc-admin-gallery-heading">
        <span className="vc-admin-gallery-title"><Camera size={17} /> Fotografias do veículo</span>
        {photos.isSuccess && <span className="vc-admin-gallery-count">{photos.data.length} de 5 fotos</span>}
      </div>
      {photos.isPending ? (
        <div className="vc-admin-gallery-message" role="status">Carregando fotografias...</div>
      ) : photos.isError ? (
        <div className="vc-admin-gallery-message" role="alert">
          <AlertCircle size={17} /> Não foi possível carregar as fotos.
          <button type="button" onClick={() => photos.refetch()}>Tentar novamente</button>
        </div>
      ) : photos.data.length === 0 ? (
        <div className="vc-admin-gallery-message"><Camera size={18} /> Este vendedor não enviou fotografias.</div>
      ) : (
        <div className="vc-admin-gallery-grid">
          {photos.data.map((photo, i) => (
            <a
              key={photo.url}
              href={photo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="vc-admin-photo"
              aria-label={`Abrir fotografia ${i + 1} em tamanho maior`}
            >
              <img src={photo.url} alt={`Foto ${i + 1} do veículo`} loading="lazy" />
              <span>Foto {i + 1} <ExternalLink size={13} /></span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  const [photosOpen, setPhotosOpen] = useState(false);
  const isTest = lead.full_name.toLocaleUpperCase('pt-BR').includes('TESTE');
  const name = lead.full_name;
  const vehicle = `${lead.model} · ${lead.year}`;

  return (
    <article className="vc-admin-lead" aria-label={`Solicitação de ${name}`}>
      <div className="vc-admin-lead-top">
        <div className="vc-admin-lead-identification">
          <div className="vc-admin-lead-kicker">
            <CarFront size={15} /> SOLICITAÇÃO DE AVALIAÇÃO
            {isTest && <span className="vc-admin-test-tag">CADASTRO TESTE</span>}
          </div>
          <h2 className="vc-admin-lead-name">{name}</h2>
          <div className="vc-admin-lead-vehicle">{vehicle}</div>
        </div>
        <div className="vc-admin-lead-actions">
          {isTest ? (
            <span className="vc-admin-action vc-admin-action-disabled" title="Cadastro fictício: não contatar este número">
              <MessageCircle size={17} /> Não contatar teste
            </span>
          ) : (
            <a
              className="vc-admin-action vc-admin-action-primary"
              href={waLink(lead.whatsapp, lead.full_name, lead.model)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Iniciar conversa no WhatsApp com ${name}`}
            >
              <MessageCircle size={17} /> Chamar no WhatsApp <ExternalLink size={14} />
            </a>
          )}
          <button
            type="button"
            className="vc-admin-action vc-admin-action-secondary"
            onClick={() => setPhotosOpen((value) => !value)}
            aria-expanded={photosOpen}
            aria-controls={`gallery-${lead.id}`}
          >
            <Camera size={17} /> {photosOpen ? 'Ocultar fotos' : 'Ver fotos'}
            {photosOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      <div className="vc-admin-contact">
        <div className="vc-admin-contact-item"><MapPin size={17} /><span><small>Cidade</small>{lead.city}</span></div>
        <div className="vc-admin-contact-item"><Phone size={17} /><span><small>WhatsApp informado</small>{formatPhone(lead.whatsapp)}</span></div>
        <div className="vc-admin-contact-item"><CalendarDays size={17} /><span><small>Recebido em</small>{formatDate(lead.created_at)}</span></div>
      </div>

      <section className="vc-admin-card-section" aria-label="Situação do veículo">
        <h3 className="vc-admin-section-title">SITUAÇÃO DO VEÍCULO</h3>
        <div className="vc-admin-tags">
          {lead.vehicle_status.map((status) => (
            <span key={status} className={`vc-admin-status vc-admin-status-${statusVariant(status)}`}>
              <span aria-hidden="true" className="vc-admin-status-dot" />
              {status}
            </span>
          ))}
        </div>
      </section>

      <div className="vc-admin-metrics">
        <div className="vc-admin-metric">
          <div className="vc-admin-metric-heading"><Gauge size={18} /> Quilometragem</div>
          <div className="vc-admin-metric-value">{lead.mileage == null ? 'Não informada' : `${numberFormat.format(lead.mileage)} km`}</div>
        </div>
        <div className="vc-admin-metric vc-admin-metric-featured">
          <div className="vc-admin-metric-heading"><Wallet size={18} /> Valor pretendido</div>
          <div className="vc-admin-metric-value">{lead.desired_price == null ? 'Não informado' : currencyFormat.format(Number(lead.desired_price))}</div>
        </div>
      </div>

      {lead.notes && (
        <section className="vc-admin-note">
          <h3><FileText size={17} /> OBSERVAÇÕES DO VENDEDOR</h3>
          <p>{lead.notes}</p>
        </section>
      )}

      {photosOpen && <div id={`gallery-${lead.id}`}><AdminPhotos leadId={lead.id} /></div>}

      <footer className="vc-admin-lead-footer">
        <div className="vc-admin-lead-attribution">
          <span>Origem: <strong>{lead.utm_source || 'Direta'}</strong></span>
          <span>Campanha: <strong>{lead.utm_campaign || 'Não informada'}</strong></span>
        </div>
        <span className="vc-admin-consent"><ShieldCheck size={15} /> Contato autorizado</span>
      </footer>
    </article>
  );
}

function ClaimOwner({ onDone }: { onDone: () => void }) {
  const claim = useServerFn(claimOwnerAdmin);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="vc-admin-access">
      <ShieldCheck size={25} />
      <div>
        <strong>Seu acesso administrativo precisa ser autorizado.</strong>
        <p>Confirme o acesso com a conta de proprietário previamente cadastrada.</p>
        {message && <p role="status">{message}</p>}
        <Button disabled={busy} onClick={async () => {
          setBusy(true);
          try {
            const result = await claim();
            if (result.ok) onDone();
            else setMessage('Esta conta não está autorizada como proprietária.');
          } catch {
            setMessage('Não foi possível verificar o acesso. Tente novamente.');
          } finally {
            setBusy(false);
          }
        }}>{busy ? 'Verificando...' : 'Verificar acesso do proprietário'}</Button>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/admin')({
  component: Admin,
  head: () => ({ meta: [
    { title: 'Solicitações de avaliação | ValeCompra Veículos' },
    { name: 'description', content: 'Área administrativa restrita da ValeCompra Veículos.' },
    { name: 'robots', content: 'noindex,nofollow' },
  ] }),
});

function Admin() {
  const navigate = useNavigate();
  const [city, setCity] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const load = useServerFn(listLeads);
  const leads = useQuery({
    queryKey: ['leads', city, status, date],
    queryFn: () => load({ data: { city, status, date } }),
    retry: false,
  });
  const filtered = Boolean(city || status || date);

  return (
    <main className="vc-admin-page">
      <div className="vc-admin-shell">
        <header className="vc-admin-header">
          <Brand />
          <button className="vc-admin-signout" onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: '/auth' });
          }} type="button"><LogOut size={16} /> Sair do painel</button>
        </header>

        <div className="vc-admin-hero">
          <div>
            <div className="vc-admin-eyebrow"><span /> ÁREA ADMINISTRATIVA</div>
            <h1>Solicitações de avaliação</h1>
            <p>Gerencie os veículos recebidos, consulte as fotos e converse com os interessados.</p>
          </div>
          <div className="vc-admin-count">
            <span>CADASTROS EXIBIDOS</span>
            <strong>{leads.data?.length ?? '—'}</strong>
            <small>Até 200 por consulta</small>
          </div>
        </div>

        <section className="vc-admin-filter-panel" aria-label="Filtrar solicitações">
          <div className="vc-admin-filter-top">
            <h2><SlidersHorizontal size={18} /> Filtrar solicitações</h2>
            {filtered && <button type="button" className="vc-admin-clear" onClick={() => {
              setCity(''); setStatus(''); setDate('');
            }}><X size={14} /> Limpar filtros</button>}
          </div>
          <div className="vc-admin-filter-grid">
            <label>
              Cidade
              <select value={city} onChange={(event) => setCity(event.target.value)}>
                <option value="">Todas as cidades</option>
                {cities.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label>
              Situação do veículo
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">Todas as situações</option>
                {statuses.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label>
              Data de recebimento
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
          </div>
        </section>

        <div className="vc-admin-results-bar">
          <div>
            <h2>Veículos recebidos</h2>
            <p>{leads.data ? `${leads.data.length} solicitaç${leads.data.length === 1 ? 'ão encontrada' : 'ões encontradas'}` : 'Carregando solicitações...'}</p>
          </div>
          <button type="button" className="vc-admin-refresh" disabled={leads.isFetching} onClick={() => leads.refetch()}>
            <RefreshCw size={16} className={leads.isFetching ? 'animate-spin' : ''} />
            {leads.isFetching ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        {leads.isPending ? (
          <div className="vc-admin-state" role="status"><Clock3 size={24} /> Carregando cadastros...</div>
        ) : leads.isError ? (
          <div className="vc-admin-state" role="alert">
            <AlertCircle size={25} />
            <strong>Não foi possível carregar as solicitações.</strong>
            <span>{leads.error.message}</span>
            <ClaimOwner onDone={() => leads.refetch()} />
          </div>
        ) : leads.data.length === 0 ? (
          <div className="vc-admin-state">
            <CarFront size={32} />
            <strong>Nenhum veículo encontrado</strong>
            <span>{filtered ? 'Altere ou limpe os filtros para ver outros cadastros.' : 'Novas solicitações aparecerão aqui automaticamente.'}</span>
          </div>
        ) : (
          <div className="vc-admin-list">
            {leads.data.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
          </div>
        )}
        <p className="vc-admin-bottom-note"><CheckCircle2 size={15} /> Apenas administradores autorizados podem visualizar estes cadastros.</p>
      </div>
    </main>
  );
}
