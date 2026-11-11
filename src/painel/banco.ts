/**
 * Everything that talks to Supabase.
 *
 * The rows are shaped by pure functions (`linhaPagina`, `linhaAnuncio`) so the
 * mapping is tested without a database. Upserts list only the columns the
 * collector owns, so a later collection never undoes what the panel set:
 * `salvo`, `nota`, `arquivo_video` and `primeira_vez` are left alone.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Ad } from "../adlibrary/types.js";
import { avaliarLowTicket } from "../simples/lowticket.js";
import { botao, destino, formato } from "../simples/mostrar.js";
import type { ConfigPainel } from "./config.js";

export type Busca = { id: number; termo: string; pais: string; nicho: string | null; ativa: boolean; criada_em: string };

export function conectar(config: Pick<ConfigPainel, "supabaseUrl" | "supabaseKey">): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Today in the computer's own time zone, as the database stores days. */
export function hoje(agora = new Date()): string {
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function linhaPagina(ad: Ad, agora: string) {
  return {
    page_id: ad.pageId as string,
    nome: ad.pageName ?? null,
    url: ad.pageUrl ?? null,
    foto_url: ad.pageProfilePictureUrl ?? null,
    curtidas: ad.pageLikes ?? null,
    ultima_vez: agora,
  };
}

export function linhaAnuncio(ad: Ad, pais: string, agora: string) {
  const video = ad.creatives.find((c) => c.videoHdUrl || c.videoSdUrl);
  const imagem = ad.creatives.find((c) => c.imageResizedUrl || c.imageUrl || c.previewImageUrl);
  const avaliacao = avaliarLowTicket(ad);
  return {
    library_id: ad.libraryId,
    page_id: ad.pageId ?? null,
    pais,
    formato: formato(ad),
    botao: botao(ad) ?? null,
    destino: destino(ad),
    link_url: ad.linkUrl ?? ad.creatives.find((c) => c.linkUrl)?.linkUrl ?? null,
    dominio: ad.linkDomain ?? null,
    titulo: ad.title ?? null,
    copy: ad.body ?? null,
    dias_no_ar: ad.daysActive ?? null,
    copias: ad.variantsUsingCreative ?? null,
    inicio: ad.startedRunning ? ad.startedRunning.slice(0, 10) : null,
    ativo: ad.isActive ?? null,
    video_url: video?.videoHdUrl ?? video?.videoSdUrl ?? null,
    imagem_url: video?.previewImageUrl ?? imagem?.imageResizedUrl ?? imagem?.imageUrl ?? imagem?.previewImageUrl ?? null,
    plataformas: ad.platforms.length ? ad.platforms : null,
    link_biblioteca: ad.adDetailsUrl,
    low_ticket: avaliacao.lowTicket,
    pontos_lt: avaliacao.pontos,
    sinais: avaliacao.sinais,
    ultima_vez: agora,
  };
}

/** One row per key: Postgres refuses to update the same row twice in one upsert. */
export function semRepetir<T>(linhas: T[], chave: (linha: T) => string): T[] {
  return [...new Map(linhas.map((l) => [chave(l), l])).values()];
}

function falhou(contexto: string, erro: { message: string } | null): void {
  if (erro) throw new Error(`${contexto}: ${erro.message}`);
}

export async function buscasAtivas(db: SupabaseClient): Promise<Busca[]> {
  const { data, error } = await db.from("buscas").select("*").eq("ativa", true).order("id");
  falhou("Não consegui ler as buscas", error);
  return (data ?? []) as Busca[];
}

/** Saves one search's ads and the fact that they appeared today. */
export async function gravarResultado(db: SupabaseClient, busca: Busca, ads: Ad[], dia: string): Promise<number> {
  const validos = ads.filter((ad) => ad.libraryId);
  if (validos.length === 0) return 0;
  const agora = new Date().toISOString();

  const paginas = semRepetir(validos.filter((ad) => ad.pageId).map((ad) => linhaPagina(ad, agora)), (p) => p.page_id);
  if (paginas.length) {
    const { error } = await db.from("paginas").upsert(paginas, { onConflict: "page_id" });
    falhou("Não consegui gravar as páginas", error);
  }

  const anuncios = semRepetir(validos.map((ad) => linhaAnuncio(ad, busca.pais, agora)), (a) => a.library_id);
  const { error: erroAnuncios } = await db.from("anuncios").upsert(anuncios, { onConflict: "library_id" });
  falhou("Não consegui gravar os anúncios", erroAnuncios);

  const aparicoes = anuncios.map((a) => ({ dia, busca_id: busca.id, library_id: a.library_id, page_id: a.page_id }));
  const { error: erroAparicoes } = await db
    .from("aparicoes")
    .upsert(aparicoes, { onConflict: "dia,busca_id,library_id", ignoreDuplicates: true });
  falhou("Não consegui gravar as aparições", erroAparicoes);

  return anuncios.length;
}

export async function registrarColeta(
  db: SupabaseClient,
  coleta: { busca_id: number; dia: string; encontrados?: number; total_meta?: number; aviso?: string; erro?: string; iniciada_em: string },
): Promise<void> {
  const { error } = await db.from("coletas").insert({ ...coleta, terminada_em: new Date().toISOString() });
  falhou("Não consegui registrar a coleta", error);
}
