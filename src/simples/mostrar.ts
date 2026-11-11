/**
 * How results look in the terminal: plain Portuguese, strongest offers first.
 *
 * Pure functions from data to text, so they can be tested without a browser.
 */

import type { Ad, Advertiser } from "../adlibrary/types.js";
import type { StoredAd } from "../store/snapshots.js";
import { NOME_PAIS } from "./args.js";

const usarCor = Boolean(process.stdout.isTTY) && !process.env["NO_COLOR"];
const pintar = (codigo: string) => (texto: string) => (usarCor ? `\x1b[${codigo}m${texto}\x1b[0m` : texto);
export const cor = {
  negrito: pintar("1"),
  fraco: pintar("2"),
  verde: pintar("32"),
  amarelo: pintar("33"),
  ciano: pintar("36"),
  vermelho: pintar("31"),
};

export function nomePais(codigo: string): string {
  return NOME_PAIS[codigo] ?? codigo;
}

const ARTIGO: Record<string, string> = {
  BR: "no", MX: "no", CL: "no", PE: "no", EC: "no", UY: "no", PY: "no", PA: "no",
  AR: "na", CO: "na", BO: "na", VE: "na", GT: "na", CR: "na", DO: "na", ES: "na",
  US: "nos", PT: "em",
};

/** "no Brasil", "na Argentina", "nos Estados Unidos". */
export function noPais(codigo: string): string {
  return `${ARTIGO[codigo] ?? "em"} ${nomePais(codigo)}`;
}

const numero = (n: number) => n.toLocaleString("pt-BR");

/** Strongest first: more copies of the same creative, then more days running. */
export function ordenarPorForca(ads: Ad[]): Ad[] {
  return [...ads].sort(
    (a, b) =>
      (b.variantsUsingCreative ?? 1) - (a.variantsUsingCreative ?? 1) ||
      (b.daysActive ?? 0) - (a.daysActive ?? 0),
  );
}

/** Where the ad sends people, in words a person uses. */
export function destino(ad: Ad): string {
  const links = [ad.linkUrl, ad.linkDomain, ...ad.creatives.map((c) => c.linkUrl)].filter(Boolean).join(" ").toLowerCase();
  const cta = `${ad.ctaType ?? ""} ${ad.ctaText ?? ""}`.toLowerCase();
  if (/wa\.me|whatsapp/.test(links) || /whatsapp/.test(cta)) return "WhatsApp";
  if (/ig\.me|instagram\.com\/direct/.test(links) || /instagram_message|instagram direct/.test(cta)) return "Direct do Instagram";
  if (/m\.me|messenger/.test(links) || /message|mensagem/.test(cta)) return "Mensagem";
  if (ad.linkDomain) return ad.linkDomain.replace(/^www\./, "");
  return "não informado";
}

export function formato(ad: Ad): string {
  const tipo = (ad.displayFormat ?? "").toUpperCase();
  if (tipo === "VIDEO" || ad.creatives.some((c) => c.kind === "video")) return "Vídeo";
  if (tipo === "CAROUSEL") return "Carrossel";
  if (tipo === "DCO") return "Criativo dinâmico";
  if (tipo === "DPA") return "Catálogo";
  return "Imagem";
}

function sinal(ad: Ad): string {
  const dias = ad.daysActive ?? 0;
  const copias = ad.variantsUsingCreative ?? 1;
  if (copias >= 5 || dias >= 60) return "🔥";
  if (copias >= 2 || dias >= 21) return "📈";
  return "🆕";
}

function dias(n: number | undefined): string {
  if (n === undefined) return "dias no ar não informados";
  return n === 1 ? "1 dia no ar" : `${numero(n)} dias no ar`;
}

function linhaCopy(texto: string | undefined, max = 160): string | undefined {
  if (!texto) return undefined;
  const uma = texto.replace(/\s+/g, " ").trim();
  return uma.length <= max ? uma : `${uma.slice(0, max - 1)}…`;
}

function linkVideo(ad: Ad): string | undefined {
  for (const c of ad.creatives) if (c.videoHdUrl || c.videoSdUrl) return c.videoHdUrl ?? c.videoSdUrl;
  return undefined;
}

/** The ranking of pages inside one search, so a scaling offer shows up at a glance. */
export function rankingPaginas(ads: Ad[]): Array<{ nome: string; pageId?: string; anuncios: number; maisAntigo: number; copias: number }> {
  const porPagina = new Map<string, { nome: string; pageId?: string; anuncios: number; maisAntigo: number; copias: number }>();
  for (const ad of ads) {
    const chave = ad.pageId ?? ad.pageName ?? "?";
    const atual = porPagina.get(chave) ?? { nome: ad.pageName ?? "Página sem nome", pageId: ad.pageId, anuncios: 0, maisAntigo: 0, copias: 0 };
    atual.anuncios += 1;
    atual.maisAntigo = Math.max(atual.maisAntigo, ad.daysActive ?? 0);
    atual.copias = Math.max(atual.copias, ad.variantsUsingCreative ?? 1);
    porPagina.set(chave, atual);
  }
  return [...porPagina.values()].sort((a, b) => b.anuncios - a.anuncios || b.maisAntigo - a.maisAntigo);
}

export function mostrarBusca(
  titulo: string,
  pais: string,
  ads: Ad[],
  extra: { total?: number; aviso?: string; url?: string } = {},
): string {
  const linhas: string[] = [];
  const total = extra.total && extra.total > ads.length ? ` ${cor.fraco(`(a Meta diz que existem uns ${numero(extra.total)})`)}` : "";
  linhas.push("", `⛏️  ${cor.negrito(titulo)} · ${nomePais(pais)} · ${numero(ads.length)} anúncio${ads.length === 1 ? "" : "s"}${total}`, "");

  if (ads.length === 0) {
    linhas.push(cor.amarelo("Nenhum anúncio encontrado."));
    if (extra.aviso) linhas.push(cor.fraco(traduzirAviso(extra.aviso)));
    linhas.push("", "Dicas: tente uma palavra mais curta, outro país (--mx) ou espere uns minutos se for bloqueio da Meta.");
    if (extra.url) linhas.push(`Confira no navegador: ${extra.url}`);
    return linhas.join("\n");
  }

  const paginas = rankingPaginas(ads).slice(0, 5);
  if (paginas.length > 1) {
    linhas.push(cor.negrito("🏆 Páginas que mais aparecem"));
    paginas.forEach((p, i) => {
      const id = p.pageId ? cor.fraco(` · nº ${p.pageId}`) : "";
      linhas.push(`   ${i + 1}. ${p.nome} — ${p.anuncios} anúncio${p.anuncios === 1 ? "" : "s"}, o mais antigo com ${dias(p.maisAntigo)}${id}`);
    });
    linhas.push("");
  }

  linhas.push(cor.negrito("📋 Anúncios, do mais forte pro mais fraco"), "");
  ordenarPorForca(ads).forEach((ad, i) => {
    const copias = ad.variantsUsingCreative && ad.variantsUsingCreative > 1 ? ` · ${cor.verde(`${ad.variantsUsingCreative} cópias do criativo`)}` : "";
    linhas.push(`${cor.negrito(`${String(i + 1).padStart(2)}.`)} ${sinal(ad)} ${cor.negrito(ad.pageName ?? "Página sem nome")} · ${cor.amarelo(dias(ad.daysActive))}${copias}`);
    const botao = ad.ctaText ? ` · Botão: ${ad.ctaText}` : "";
    linhas.push(`     ${formato(ad)}${botao} · Leva pra: ${cor.ciano(destino(ad))}`);
    const copy = linhaCopy(ad.body);
    if (copy) linhas.push(`     ${cor.fraco(`"${copy}"`)}`);
    const video = linkVideo(ad);
    if (video) linhas.push(`     🎬 ${video}`);
    linhas.push(`     🔗 ${ad.adDetailsUrl}`, "");
  });

  linhas.push(cor.fraco("🔥 forte (muitas cópias ou 60+ dias)   📈 crescendo   🆕 recente"));
  linhas.push(cor.fraco("Tempo no ar e cópias do criativo são sinais, não números de venda."));
  return linhas.join("\n");
}

export function mostrarPaginas(termo: string, pais: string, paginas: Advertiser[]): string {
  const linhas = ["", `🔎 ${cor.negrito(`Páginas anunciando "${termo}"`)} · ${nomePais(pais)}`, ""];
  if (paginas.length === 0) {
    linhas.push(cor.amarelo("Nenhuma página encontrada com anúncios pra esse termo."));
    return linhas.join("\n");
  }
  paginas.forEach((p, i) => {
    const qtd = p.adCount ? ` — ${p.adCount} anúncio${p.adCount === 1 ? "" : "s"} vistos` : "";
    linhas.push(`${String(i + 1).padStart(2)}. ${cor.negrito(p.pageName ?? "Página sem nome")}${qtd}`);
    linhas.push(`    Número da página: ${cor.ciano(p.pageId)}`);
  });
  linhas.push("", `Pra ver os anúncios de uma delas: ${cor.negrito("minerador concorrente <número da página>")}`);
  return linhas.join("\n");
}

export function mostrarAnuncio(ad: Ad): string {
  const linhas = ["", `${sinal(ad)} ${cor.negrito(ad.pageName ?? "Página sem nome")} · ${cor.amarelo(dias(ad.daysActive))}`];
  if (ad.variantsUsingCreative && ad.variantsUsingCreative > 1) linhas.push(cor.verde(`${ad.variantsUsingCreative} cópias desse criativo rodando`));
  linhas.push(`${formato(ad)}${ad.ctaText ? ` · Botão: ${ad.ctaText}` : ""} · Leva pra: ${cor.ciano(destino(ad))}`);
  if (ad.startedRunning) linhas.push(`Começou em: ${ad.startedRunning.slice(0, 10)}`);
  if (ad.platforms.length) linhas.push(`Onde aparece: ${ad.platforms.join(", ")}`);
  if (ad.linkUrl) linhas.push(`Link de destino: ${ad.linkUrl}`);
  if (ad.title) linhas.push("", cor.negrito("Título"), ad.title);
  if (ad.body) linhas.push("", cor.negrito("Copy"), ad.body.trim());

  const copiasDiferentes = ad.creatives.filter((c) => c.body && c.body.trim() !== (ad.body ?? "").trim());
  if (copiasDiferentes.length) {
    linhas.push("", cor.negrito("Outras versões da copy"));
    copiasDiferentes.forEach((c, i) => linhas.push(`${i + 1}. ${c.body?.trim()}`));
  }

  const midias = ad.creatives
    .map((c) => c.videoHdUrl ?? c.videoSdUrl ?? c.imageUrl)
    .filter((u): u is string => Boolean(u));
  if (midias.length) {
    linhas.push("", cor.negrito("Criativos"));
    midias.forEach((u, i) => linhas.push(`${i + 1}. ${u}`));
    linhas.push(cor.fraco("Esses links expiram em alguns dias. Baixe o que quiser guardar."));
  }
  linhas.push("", `🔗 ${ad.adDetailsUrl}`);
  return linhas.join("\n");
}

export function mostrarMudancas(pageId: string, antes: Map<string, StoredAd>, agora: Ad[]): string {
  const linhas = ["", `🔄 ${cor.negrito(`O que mudou na página ${pageId}`)}`, ""];
  if (antes.size === 0) {
    linhas.push(`Primeira vez olhando essa página: guardei uma "foto" com ${agora.length} anúncio${agora.length === 1 ? "" : "s"}.`);
    linhas.push("Rode o mesmo comando daqui a alguns dias pra ver o que entrou e o que saiu.");
    return linhas.join("\n");
  }
  const atuais = new Set(agora.map((a) => a.libraryId));
  const novos = agora.filter((a) => !antes.has(a.libraryId));
  const sumiram = [...antes.values()].filter((a) => !atuais.has(a.libraryId));

  linhas.push(cor.verde(`🟢 Começaram a rodar: ${novos.length}`));
  for (const ad of novos) linhas.push(`   • ${formato(ad)} · ${linhaCopy(ad.body, 100) ?? "sem copy"}`, `     ${cor.fraco(ad.adDetailsUrl)}`);
  linhas.push("", cor.vermelho(`🔴 Não aparecem mais: ${sumiram.length}`));
  for (const ad of sumiram) linhas.push(`   • ${formato(ad)} · ${linhaCopy(ad.body, 100) ?? "sem copy"}`, `     ${cor.fraco(`visto até ${new Date(ad.lastSeen).toLocaleDateString("pt-BR")}`)}`);
  linhas.push("", cor.fraco(`Rodando agora: ${agora.length}. "Não aparecem mais" quase sempre quer dizer que foi desligado.`));
  return linhas.join("\n");
}

/** One row per ad, for opening in Excel or Google Sheets. */
export function planilhaCsv(ads: Ad[]): string {
  const cabecalho = ["Página", "Número da página", "Dias no ar", "Cópias do criativo", "Formato", "Botão", "Leva pra", "Copy", "Link do vídeo", "Link do anúncio"];
  const campo = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/\s+/g, " ").trim()}"`;
  const linhas = ordenarPorForca(ads).map((ad) =>
    [ad.pageName, ad.pageId, ad.daysActive, ad.variantsUsingCreative ?? 1, formato(ad), ad.ctaText, destino(ad), ad.body, linkVideo(ad), ad.adDetailsUrl]
      .map(campo)
      .join(";"),
  );
  // BOM + ";" so Excel in Portuguese opens it with accents and columns right.
  return `﻿${[cabecalho.map(campo).join(";"), ...linhas].join("\r\n")}\r\n`;
}

/** Meta's notes come back in English; say the useful part in Portuguese. */
export function traduzirAviso(aviso: string): string {
  const baixo = aviso.toLowerCase();
  if (baixo.includes("captcha")) return "A Meta pediu verificação (captcha). Espere alguns minutos antes de buscar de novo.";
  if (baixo.includes("rate") || baixo.includes("reported a total")) return "A Meta segurou as buscas por um momento. Espere um pouco e tente uma vez de novo.";
  return aviso;
}
