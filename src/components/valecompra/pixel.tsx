import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/lib/site-config';
type Pixel = ((...args:unknown[])=>void)&{queue?:unknown[][];callMethod?:(...args:unknown[])=>void;push?:Pixel;loaded?:boolean;version?:string};
declare global {interface Window {fbq?:Pixel;_fbq?:Pixel;}}
export function trackLead(){if(sessionStorage.getItem('vc_marketing')==='accepted' && siteConfig.pixelId && window.fbq)window.fbq('track','Lead');}
export function PixelConsent(){const [choice,setChoice]=useState<string|null>('pending');useEffect(()=>{setChoice(sessionStorage.getItem('vc_marketing'));},[]);
 useEffect(()=>{if(choice!=='accepted'||!/^\d+$/.test(siteConfig.pixelId)||window.fbq)return;const pixel:Pixel=function(...args:unknown[]){if(pixel.callMethod)pixel.callMethod(...args);else pixel.queue?.push(args)};pixel.queue=[];pixel.push=pixel;pixel.loaded=true;pixel.version='2.0';window.fbq=pixel;window._fbq=pixel;const script=document.createElement('script');script.async=true;script.src='https://connect.facebook.net/pt_BR/fbevents.js';document.head.appendChild(script);pixel('init',siteConfig.pixelId);pixel('track','PageView');},[choice]);
 if(!siteConfig.pixelId || choice!==null)return null;
 const choose=(value:string)=>{sessionStorage.setItem('vc_marketing',value);setChoice(value)};
 return <aside className="cookie-banner" aria-label="Preferências de privacidade"><p>Podemos usar o Meta Pixel para medir nossos anúncios? É opcional e não interfere na avaliação. Sem sua autorização, ele permanece desativado.</p><div className="cookie-actions"><Button size="sm" onClick={()=>choose('accepted')}>Permitir</Button><Button size="sm" variant="outline" onClick={()=>choose('declined')}>Não permitir</Button></div></aside>
}