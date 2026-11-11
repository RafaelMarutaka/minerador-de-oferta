/**
 * Is this ad a low-ticket digital offer, or a store, an app or a big brand?
 *
 * A keyword search returns everyone who used the word: Mercado Livre's catalog,
 * Adobe selling Acrobat on "pdf", a sewing app, a shop that mails paper
 * patterns. This scores what the ad shows (where it leads, what the copy says,
 * how it is built) and keeps the ones that look like a digital product sold
 * cheaply, usually through WhatsApp or a simple sales page.
 *
 * It is a heuristic. Every point it gives is listed in `sinais`, so the panel
 * can show why an ad was kept or dropped.
 */

import type { Ad } from "../adlibrary/types.js";

export type Avaliacao = { lowTicket: boolean; pontos: number; sinais: string[] };

/** Retail, marketplaces, app stores and big software: never a low-ticket digital offer. */
const DOMINIOS_FORA = [
  "mercadolivre", "mercadolibre", "amazon.", "shein.", "temu.", "aliexpress", "shopee", "magazineluiza", "magalu",
  "americanas", "casasbahia", "walmart", "liverpool.com", "coppel", "netshoes", "dafiti", "kabum", "carrefour",
  "adobe.com", "canva.com", "apple.com", "microsoft.com", "google.com", "play.google", "apps.apple", "app.adjust",
  "adj.st", "onelink.me", "app.link", "itunes.apple", "spotify.com", "netflix.com", "hyundai", "toyota", "samsung.com",
];

/** Where infoproducts are sold, and the quick-page builders people use for them. */
const DOMINIOS_INFOPRODUTO = [
  "hotmart", "hotm.art", "kiwify", "eduzz", "monetizze", "braip", "ticto", "lastlink", "cakto", "perfectpay",
  "greenn", "payt.", "pepper.", "kirvano", "hubla", "doppus", "pay.", "checkout.", "netlify.app", "vercel.app",
  "lovable.app", "carrd.co", "wixsite.com", "webflow.io", "blogspot.", "sites.google", "linktr.ee", "builderall",
  "systeme.io", "framer.", "gamma.site", "notion.site", "canva.site", "wordpress.com", "hotmart.host", "kpages",
  "greatpages", "lpages", "pages.",
];

const PALAVRAS_DIGITAIS =
  /\b(pdf|apostilas?|e-?books?|material(?:es)? digita(?:l|is)|arquivos?|download|imprim(?:ir|ível|íveis|ible)|para imprimir|planners?|plantillas?|gu[ií]as?|kits?|packs?|atividades|actividades|receitas|recetas|recetario|videoaulas?|aulas?|clases|cursos?|templates?|artes|mapas mentais|fichas|resumos|moldes|patrones|digital|acesso imediato|acceso inmediato|acesso vitalício|acceso de por vida)\b/gi;

const VOLUME = /\+\s?\d{2,5}\b|\bmais de \d{2,5}\b|\bmás de \d{2,5}\b/i;

const PRECO_BAIXO =
  /\b(por apenas|apenas r\$|só r\$|por só|por solo|solo \$|a partir de r\$|menos de r\$|por menos de)\b|r\$\s?(?:[1-4]\d|[5-9])(?:[,.]\d{2})?\b|\$\s?\d{2,3}\s?(?:mxn|pesos)\b|mx\$\s?\d{2,3}\b/i;

const FISICO =
  /(\bfrete\b|envio pelos correios|\benviamos\b|\bentregamos\b|\bentrega (?:em|para|rápida)|\benvío|\benvios? a todo|a domicilio|loja física|tienda física|\bpresencial|\bshowroom\b|\bdelivery\b|retire na loja|vives en #|inscripciones abiertas en|endere[cç]o:|direcci[oó]n:)/i;

function linksDe(ad: Ad): string {
  return [ad.linkUrl, ad.linkDomain, ...ad.creatives.map((c) => c.linkUrl)].filter(Boolean).join(" ").toLowerCase();
}

function textoDe(ad: Ad): string {
  return [ad.title, ad.body, ad.linkDescription, ...ad.creatives.flatMap((c) => [c.title, c.body])].filter(Boolean).join(" ");
}

export function avaliarLowTicket(ad: Ad): Avaliacao {
  const sinais: string[] = [];
  let pontos = 0;
  const links = linksDe(ad);
  const texto = textoDe(ad);
  const cta = `${ad.ctaType ?? ""} ${ad.ctaText ?? ""}`.toLowerCase();
  const formatoBruto = (ad.displayFormat ?? "").toUpperCase();

  // What rules an ad out.
  if (formatoBruto === "DPA" || /\{\{[^}]+\}\}/.test(texto)) {
    pontos -= 10;
    sinais.push("anúncio de catálogo de loja");
  }
  const fora = DOMINIOS_FORA.find((d) => links.includes(d));
  if (fora) {
    pontos -= 10;
    sinais.push(`site de loja, app ou marca grande (${fora.replace(/\.$/, "")})`);
  }
  if (/install|use_app|use app|instalar|usar app/.test(cta)) {
    pontos -= 5;
    sinais.push("instalação de aplicativo");
  }
  if ((ad.pageLikes ?? 0) > 1_000_000) {
    pontos -= 4;
    sinais.push("página gigante (mais de 1 milhão de curtidas)");
  }
  if (FISICO.test(texto)) {
    pontos -= 3;
    sinais.push("produto físico ou presencial");
  }

  // What points to a low-ticket digital offer.
  if (/wa\.me|whatsapp|ig\.me|instagram\.com\/direct|m\.me|messenger/.test(links) || /whatsapp|message|mensagem|mensaje/.test(cta)) {
    pontos += 2;
    sinais.push("vende pelo WhatsApp/Direct");
  }
  const plataforma = DOMINIOS_INFOPRODUTO.find((d) => links.includes(d));
  if (plataforma) {
    pontos += 3;
    sinais.push(`página de infoproduto (${plataforma.replace(/\.$/, "")})`);
  }
  const palavras = new Set((texto.match(PALAVRAS_DIGITAIS) ?? []).map((p) => p.toLowerCase()));
  if (palavras.size > 0) {
    pontos += palavras.size >= 2 ? 3 : 2;
    sinais.push(`produto digital (${[...palavras].slice(0, 3).join(", ")})`);
  }
  if (VOLUME.test(texto)) {
    pontos += 1;
    sinais.push('quantidade no gancho ("+100", "mais de 500")');
  }
  if (PRECO_BAIXO.test(texto)) {
    pontos += 2;
    sinais.push("preço baixo na copy");
  }

  return { lowTicket: pontos >= 3, pontos, sinais };
}
