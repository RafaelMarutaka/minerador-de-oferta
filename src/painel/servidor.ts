/**
 * The panel's local server.
 *
 * Listens on 127.0.0.1 only, serves the page, and answers the page's requests
 * by talking to Supabase with the key from this computer's config. The
 * browser never sees the key.
 *
 * Two checks keep other websites out: the Host header must be this server
 * (against DNS rebinding), and every request that changes something must carry
 * the X-Minerador header, which a page on another site cannot send without the
 * server agreeing to it first.
 */

import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";
import { codigoPais } from "../simples/args.js";
import { conectar } from "./banco.js";
import { carregarConfig, type ConfigPainel } from "./config.js";
import { comandoColeta } from "./agendar.js";

const PAGINA = fileURLToPath(new URL("../../painel/index.html", import.meta.url));

class Erro extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function json(res: ServerResponse, status: number, corpo: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(corpo));
}

async function lerCorpo(req: IncomingMessage): Promise<Record<string, unknown>> {
  const partes: Buffer[] = [];
  let tamanho = 0;
  for await (const parte of req) {
    tamanho += (parte as Buffer).length;
    if (tamanho > 100_000) throw new Erro(413, "Pedido grande demais.");
    partes.push(parte as Buffer);
  }
  if (partes.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(partes).toString("utf8")) as Record<string, unknown>;
  } catch {
    throw new Erro(400, "Pedido inválido.");
  }
}

function checar(contexto: string, erro: { message: string } | null): void {
  if (erro) throw new Erro(502, `${contexto}: ${erro.message}`);
}

export function nomeArquivoVideo(pagina: string | null | undefined, libraryId: string): string {
  const base = (pagina ?? "anuncio")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "anuncio"}-${libraryId}.mp4`;
}

type Rotas = (metodo: string, caminho: string[], url: URL, req: IncomingMessage) => Promise<unknown>;

function rotas(db: SupabaseClient, config: ConfigPainel, estado: { coletando: boolean }): Rotas {
  return async (metodo, caminho, url, req) => {
    const [, recurso, id] = caminho;

    if (metodo === "GET" && recurso === "resumo") {
      const [buscas, anuncios, paginas, coletas] = await Promise.all([
        db.from("buscas").select("id", { count: "exact", head: true }).eq("ativa", true),
        db.from("anuncios").select("library_id", { count: "exact", head: true }),
        db.from("paginas").select("page_id", { count: "exact", head: true }),
        db.from("coletas").select("dia, terminada_em, erro").order("id", { ascending: false }).limit(1),
      ]);
      checar("Resumo", buscas.error ?? anuncios.error ?? paginas.error ?? coletas.error);
      return {
        buscas_ativas: buscas.count ?? 0,
        anuncios: anuncios.count ?? 0,
        paginas: paginas.count ?? 0,
        ultima_coleta: coletas.data?.[0] ?? null,
        coletando: estado.coletando,
      };
    }

    if (metodo === "GET" && recurso === "ofertas") {
      const p = url.searchParams;
      let q = db.from("ofertas").select("*");
      if (p.get("agora") !== "0") q = q.eq("no_ar_agora", true);
      if (p.get("lt") !== "0") q = q.eq("low_ticket", true);
      if (p.get("ignoradas") !== "1") q = q.eq("ignorada", false);
      if (p.get("salvos") === "1") q = q.eq("salvo", true);
      if (p.get("termo")) q = q.contains("termos", [p.get("termo")]);
      if (p.get("nicho")) q = q.contains("nichos", [p.get("nicho")]);
      if (p.get("pais")) q = q.eq("pais", p.get("pais"));
      if (p.get("formato")) q = q.eq("formato", p.get("formato"));
      if (p.get("destino") === "mensagem") q = q.in("destino", ["WhatsApp", "Direct do Instagram", "Mensagem"]);
      else if (p.get("destino") === "site") q = q.not("destino", "in", '("WhatsApp","Direct do Instagram","Mensagem")');
      const minDias = Number(p.get("min_dias") ?? "0");
      if (minDias > 0) q = q.gte("dias_no_ar", minDias);
      const texto = (p.get("q") ?? "").trim().replace(/[%*,()"\\]/g, " ").trim();
      if (texto) q = q.or(`copy.ilike.*${texto}*,pagina.ilike.*${texto}*,titulo.ilike.*${texto}*`);
      const ordem = p.get("ordem") ?? "forca";
      const coluna = ordem === "dias" ? "dias_no_ar" : ordem === "novos" ? "primeira_vez" : ordem === "copias" ? "copias" : "forca";
      q = q.order(coluna, { ascending: false, nullsFirst: false }).limit(Math.min(Number(p.get("limite") ?? "60") || 60, 200));
      const { data, error } = await q;
      checar("Ofertas", error);
      return data ?? [];
    }

    if (metodo === "GET" && recurso === "filtros") {
      const { data, error } = await db.from("buscas").select("termo, pais, nicho").order("termo");
      checar("Filtros", error);
      const lista = data ?? [];
      return {
        termos: [...new Set(lista.map((b) => b.termo))],
        nichos: [...new Set(lista.map((b) => b.nicho).filter(Boolean))].sort(),
        paises: [...new Set(lista.map((b) => b.pais))].sort(),
      };
    }

    if (metodo === "GET" && recurso === "crescendo") {
      const janela = Math.min(Math.max(Number(url.searchParams.get("janela") ?? "7") || 7, 1), 60);
      const { data, error } = await db.rpc("paginas_crescendo", { janela, so_low_ticket: url.searchParams.get("lt") !== "0" });
      checar("Crescimento", error);
      return ((data ?? []) as Array<{ crescimento: number; anuncios_agora: number }>)
        .sort((a, b) => b.crescimento - a.crescimento || b.anuncios_agora - a.anuncios_agora)
        .slice(0, 50);
    }

    if (metodo === "GET" && recurso === "novidades") {
      const desde = new Date(Date.now() - 3 * 86_400_000).toISOString();
      const { data, error } = await db.from("paginas").select("*").gte("primeira_vez", desde).order("primeira_vez", { ascending: false }).limit(200);
      checar("Novidades", error);
      const paginas = data ?? [];
      const ids = paginas.map((p) => p.page_id);
      if (ids.length === 0) return [];
      const [ignoradas, lt] = await Promise.all([
        db.from("paginas_ignoradas").select("page_id").in("page_id", ids),
        db.from("anuncios").select("page_id").in("page_id", ids).eq("low_ticket", true),
      ]);
      checar("Novidades", ignoradas.error ?? lt.error);
      const fora = new Set((ignoradas.data ?? []).map((r) => r.page_id));
      const comLowTicket = new Set((lt.data ?? []).map((r) => r.page_id));
      const soLowTicket = url.searchParams.get("lt") !== "0";
      return paginas.filter((p) => !fora.has(p.page_id) && (!soLowTicket || comLowTicket.has(p.page_id))).slice(0, 60);
    }

    if (metodo === "GET" && recurso === "pagina" && id) {
      const [pagina, dias, anuncios] = await Promise.all([
        db.from("paginas").select("*").eq("page_id", id).maybeSingle(),
        db.from("paginas_por_dia").select("dia, anuncios").eq("page_id", id).order("dia"),
        db.from("ofertas").select("*").eq("page_id", id).order("forca", { ascending: false }).limit(100),
      ]);
      checar("Página", pagina.error ?? dias.error ?? anuncios.error);
      if (!pagina.data) throw new Erro(404, "Página não encontrada.");
      return { pagina: pagina.data, dias: dias.data ?? [], anuncios: anuncios.data ?? [] };
    }

    if (recurso === "buscas") {
      if (metodo === "GET") {
        const { data, error } = await db.from("buscas").select("*").order("criada_em", { ascending: false });
        checar("Buscas", error);
        return data ?? [];
      }
      if (metodo === "POST") {
        const corpo = await lerCorpo(req);
        const termo = String(corpo["termo"] ?? "").trim();
        const pais = codigoPais(String(corpo["pais"] ?? "BR"));
        if (!termo) throw new Erro(400, "Digite a palavra que quer minerar.");
        if (!pais) throw new Erro(400, "País inválido.");
        const nicho = String(corpo["nicho"] ?? "").trim() || null;
        const { data, error } = await db.from("buscas").insert({ termo, pais, nicho }).select().single();
        if (error?.code === "23505") throw new Erro(409, "Essa palavra já está na lista pra esse país.");
        checar("Nova busca", error);
        return data;
      }
      if (metodo === "PATCH" && id) {
        const corpo = await lerCorpo(req);
        const { data, error } = await db.from("buscas").update({ ativa: Boolean(corpo["ativa"]) }).eq("id", Number(id)).select().single();
        checar("Busca", error);
        return data;
      }
      if (metodo === "DELETE" && id) {
        const { error } = await db.from("buscas").delete().eq("id", Number(id));
        checar("Apagar busca", error);
        return { ok: true };
      }
    }

    if (metodo === "POST" && recurso === "salvar" && id) {
      const corpo = await lerCorpo(req);
      const salvo = Boolean(corpo["salvo"]);
      const mudanca: Record<string, unknown> = { salvo };
      if (typeof corpo["nota"] === "string") mudanca["nota"] = corpo["nota"].slice(0, 2000);
      const { data, error } = await db.from("anuncios").update(mudanca).eq("library_id", id).select("library_id, video_url, page_id, salvo").single();
      checar("Salvar", error);

      let arquivo: string | undefined;
      let aviso: string | undefined;
      if (salvo && data?.video_url) {
        try {
          const { data: pg } = await db.from("paginas").select("nome").eq("page_id", data.page_id ?? "").maybeSingle();
          const resposta = await fetch(data.video_url);
          if (!resposta.ok) throw new Error(String(resposta.status));
          await mkdir(config.pastaVideos, { recursive: true });
          arquivo = join(config.pastaVideos, nomeArquivoVideo(pg?.nome, id));
          await writeFile(arquivo, Buffer.from(await resposta.arrayBuffer()));
          await db.from("anuncios").update({ arquivo_video: arquivo }).eq("library_id", id);
        } catch {
          aviso = "Salvei o anúncio, mas o link do vídeo já expirou. Abra na Biblioteca pra baixar.";
        }
      }
      return { ok: true, salvo, arquivo, aviso };
    }

    if (recurso === "ignoradas" && metodo === "GET") {
      const { data, error } = await db.from("paginas_ignoradas").select("*").order("criada_em", { ascending: false });
      checar("Páginas ignoradas", error);
      return data ?? [];
    }

    if (metodo === "POST" && recurso === "ignorar" && id) {
      const corpo = await lerCorpo(req);
      if (corpo["ignorar"] === false) {
        const { error } = await db.from("paginas_ignoradas").delete().eq("page_id", id);
        checar("Voltar a mostrar", error);
        return { ok: true, ignorada: false };
      }
      const { data: pg } = await db.from("paginas").select("nome").eq("page_id", id).maybeSingle();
      const { error } = await db.from("paginas_ignoradas").upsert({ page_id: id, nome: pg?.nome ?? null }, { onConflict: "page_id" });
      checar("Ignorar página", error);
      return { ok: true, ignorada: true };
    }

    if (metodo === "POST" && recurso === "coletar") {
      if (estado.coletando) return { ok: true, ja: true };
      const { node, script } = comandoColeta();
      const filho = spawn(node, [script, "coletar", "--log"], { stdio: "ignore", windowsHide: true });
      estado.coletando = true;
      filho.on("exit", () => (estado.coletando = false));
      filho.on("error", () => (estado.coletando = false));
      return { ok: true };
    }

    throw new Erro(404, "Não encontrado.");
  };
}

export async function iniciarPainel(porta = 4321): Promise<{ url: string; fechar: () => Promise<void> }> {
  const config = await carregarConfig();
  const db = conectar(config);
  const estado = { coletando: false };
  const responder = rotas(db, config, estado);
  const hostsAceitos = new Set([`127.0.0.1:${porta}`, `localhost:${porta}`]);

  const servidor = createServer(async (req, res) => {
    try {
      if (!hostsAceitos.has(req.headers.host ?? "")) throw new Erro(403, "Acesso só pelo próprio computador.");
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      const metodo = req.method ?? "GET";

      if (metodo === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        res.writeHead(200, {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "content-security-policy":
            "default-src 'self'; img-src * data: blob:; media-src *; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'",
          "referrer-policy": "no-referrer",
        });
        res.end(await readFile(PAGINA, "utf8"));
        return;
      }

      if (!url.pathname.startsWith("/api/")) throw new Erro(404, "Não encontrado.");
      if (metodo !== "GET" && req.headers["x-minerador"] !== "1") throw new Erro(403, "Pedido recusado.");
      json(res, 200, await responder(metodo, url.pathname.split("/").slice(1).map(decodeURIComponent), url, req));
    } catch (erro) {
      const status = erro instanceof Erro ? erro.status : 500;
      json(res, status, { erro: erro instanceof Error ? erro.message : String(erro) });
    }
  });

  await new Promise<void>((resolve, reject) => {
    servidor.once("error", reject);
    servidor.listen(porta, "127.0.0.1", () => resolve());
  });
  return {
    url: `http://127.0.0.1:${porta}`,
    fechar: () => new Promise((r) => servidor.close(() => r())),
  };
}
