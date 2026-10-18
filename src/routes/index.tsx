import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowUpRight, BadgeCheck, CalendarClock, CheckCircle2, FileWarning, MapPin, MessageCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Brand } from '@/components/valecompra/brand';
import { LeadForm } from '@/components/valecompra/lead-form';
import { PixelConsent } from '@/components/valecompra/pixel';
import hero from '@/assets/valecompra-car.svg';

export const Route = createFileRoute('/')({
  component: Index,
  head: () => ({
    meta: [
      { title: 'Carro com parcelas atrasadas, multas ou IPVA? | ValeCompra Veículos' },
      { name: 'description', content: 'Carro financiado, parcelas atrasadas, multas ou IPVA vencido? Solicite uma avaliação gratuita da ValeCompra Veículos em São José dos Campos, Jacareí, Caçapava e Taubaté. Sem compromisso.' },
      { property: 'og:title', content: 'Parcelas atrasadas ou multas? Avalie seu carro | ValeCompra' },
      { property: 'og:description', content: 'Seu carro tem pendências? Conte a situação e veja se podemos negociar. Avaliação gratuita e sem compromisso.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'pt_BR' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
});

function EvaluateButton({ label = 'Quero vender meu carro', compact = false }: { label?: string; compact?: boolean }) {
  return (
    <Button asChild size={compact ? 'default' : 'lg'} className={compact ? 'vc-simple-button vc-simple-button-small' : 'vc-simple-button'}>
      <a href="#avaliacao">{label}<ArrowUpRight size={17} aria-hidden="true" /></a>
    </Button>
  );
}

const situations = [
  {
    icon: CalendarClock,
    title: 'Parcelas atrasadas',
    text: 'O financiamento está atrasado? Informe a situação para avaliarmos o carro e os débitos.',
  },
  {
    icon: FileWarning,
    title: 'IPVA ou multas em aberto',
    text: 'Tem débitos ou documentação pendente? Podemos analisar o caso antes de uma eventual negociação.',
  },
  {
    icon: BadgeCheck,
    title: 'Financiado em dia ou quitado',
    text: 'Também avaliamos carros populares usados que estão financiados em dia ou já quitados.',
  },
];

const steps = [
  { number: '01', title: 'Envie os dados', text: 'Preencha o formulário e, se quiser, adicione até 5 fotos do carro.' },
  { number: '02', title: 'Analisamos o carro', text: 'Verificamos as informações e as pendências para avaliar a possibilidade de compra.' },
  { number: '03', title: 'Entramos em contato', text: 'Se houver possibilidade de negociação, nossa equipe chama você no WhatsApp informado.' },
];

function Index() {
  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only">Ir para o conteúdo</a>
      <header className="site-header vc-simple-header">
        <div className="container header-inner">
          <Brand />
          <nav className="header-nav" aria-label="Ação principal">
            <EvaluateButton label="Avaliar meu carro" compact />
          </nav>
        </div>
      </header>

      <main id="conteudo" className="vc-simple-page">
        {/* Seção 1: dor real + cadastro, lado a lado. */}
        <section className="hero vc-simple-hero" aria-labelledby="vc-hero-title">
          <img className="hero-photo" src={hero} width={1440} height={960} fetchPriority="high" alt="" aria-hidden="true" />
          <div className="container hero-layout">
            <div className="hero-copy">
              <p className="eyebrow region-eyebrow"><MapPin size={15} aria-hidden="true" /> São José dos Campos · Jacareí · Caçapava · Taubaté</p>
              <span className="vc-simple-eyebrow">COMPRAMOS CARROS POPULARES E USADOS</span>
              <h1 id="vc-hero-title">Parcelas atrasadas, multas ou <span>IPVA vencido?</span></h1>
              <p className="hero-description">Sabemos que vender um carro com pendências pode ser complicado. <strong>Conte a situação do seu veículo.</strong> A ValeCompra analisa se existe possibilidade de compra, sem compromisso.</p>
              <div className="hero-actions"><EvaluateButton /></div>
              <div className="trust-list" aria-label="Vantagens da avaliação">
                <span className="trust-item"><CheckCircle2 aria-hidden="true" /> Avaliação gratuita</span>
                <span className="trust-item"><CheckCircle2 aria-hidden="true" /> Sem obrigação de vender</span>
              </div>
              <p className="hero-caption"><ShieldCheck size={15} aria-hidden="true" /> Toda negociação está sujeita à análise do veículo e à regularização documental.</p>
            </div>
            <LeadForm />
          </div>
        </section>

        {/* Seção 2: identificação imediata. */}
        <section className="vc-simple-situations" aria-labelledby="vc-situations-title">
          <div className="container">
            <p className="eyebrow">PODEMOS ANALISAR DIFERENTES SITUAÇÕES</p>
            <h2 id="vc-situations-title">Seu carro está em uma dessas condições?</h2>
            <div className="vc-simple-situation-grid">
              {situations.map(({ icon: Icon, title, text }) => (
                <article className="vc-simple-situation-card" key={title}>
                  <span className="vc-simple-situation-icon"><Icon size={23} strokeWidth={1.7} aria-hidden="true" /></span>
                  <div><h3>{title}</h3><p>{text}</p></div>
                </article>
              ))}
            </div>
            <p className="vc-simple-situation-note"><ShieldCheck size={15} aria-hidden="true" /> A avaliação não garante compra ou quitação de dívidas. Cada caso depende de análise.</p>
          </div>
        </section>

        {/* Seção 3: processo simples + última chamada. */}
        <section className="vc-simple-process" id="como-funciona" aria-labelledby="vc-process-title">
          <div className="container">
            <p className="eyebrow">RÁPIDO DE ENTENDER</p>
            <h2 id="vc-process-title">Como funciona a avaliação?</h2>
            <div className="vc-simple-step-grid">
              {steps.map(({ number, title, text }) => (
                <article className="vc-simple-step" key={number}>
                  <span>{number}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            <div className="vc-simple-last-cta">
              <div><strong>Quer saber se podemos comprar seu carro?</strong><p>Envie os dados e a situação atual. É gratuito e sem obrigação de vender.</p></div>
              <EvaluateButton label="Solicitar avaliação gratuita" compact />
            </div>
            <p className="vc-simple-disclaimer">Financiamentos, débitos e gravames devem ser regularizados conforme as exigências legais e do credor para uma eventual transferência. Não assumimos financiamentos automaticamente.</p>
          </div>
        </section>
      </main>

      <footer className="footer vc-simple-footer">
        <div className="container vc-simple-footer-inner">
          <Brand />
          <div>
            <p>São José dos Campos · Jacareí · Caçapava · Taubaté</p>
            <p>© {new Date().getFullYear()} ValeCompra Veículos · <Link to="/privacidade">Política de Privacidade</Link></p>
          </div>
        </div>
      </footer>
      <a
        className="vc-whatsapp-float"
        href="https://wa.me/5512988454439?text=Ol%C3%A1%21%20Quero%20vender%20meu%20carro%20e%20gostaria%20de%20saber%20como%20funciona%20a%20avalia%C3%A7%C3%A3o."
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar com a ValeCompra pelo WhatsApp: (12) 98845-4439"
      >
        <MessageCircle size={23} strokeWidth={2.3} aria-hidden="true" />
        <span>Falar no WhatsApp</span>
      </a>
      <PixelConsent />
    </>
  );
}
