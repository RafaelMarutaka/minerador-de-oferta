#!/usr/bin/env node
/**
 * `minerador`: the easy way in, in Portuguese.
 *
 *   minerador moldes
 *   minerador plantillas --mx
 *   minerador pagina "Moldes da Ana"
 *
 * It reads the same Ad Library as `minerador-cli`, and prints results for a
 * person to read: strongest offers first, pages ranked, where each ad leads.
 * `minerador-cli` stays for scripts and JSON.
 */

import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Backend } from "./adlibrary/types.js";
import { buildUrl } from "./adlibrary/url.js";
import { createBackend } from "./backends/index.js";
import { defaultCountry, loadConfig } from "./config.js";
import { AdLibraryError } from "./errors.js";
import { SnapshotStore } from "./store/snapshots.js";
import { lerPedido, type Opcoes } from "./simples/args.js";
import {
  cor,
  mostrarAnuncio,
  mostrarBusca,
  mostrarMudancas,
  mostrarPaginas,
  noPais,
  nomePais,
  planilhaCsv,
  traduzirAviso,
} from "./simples/mostrar.js";

const QUANTIDADE_PADRAO = 30;

const AJUDA = `
${cor.negrito("⛏️  Minerador de Oferta")}

${cor.negrito("Buscar ofertas")}
  minerador moldes                     anúncios ativos de "moldes" no Brasil
  minerador moldes de costura          pode digitar várias palavras, sem aspas
  minerador plantillas --mx            no México (--ar, --co, --cl, --us…)
  minerador moldes --videos            só anúncios em vídeo
  minerador moldes -n 60               traz 60 anúncios (padrão: ${QUANTIDADE_PADRAO})
  minerador moldes --planilha          salva também uma planilha pra abrir no Excel

${cor.negrito("Espiar um concorrente")}
  minerador pagina Moldes da Ana       acha o número da página
  minerador concorrente 123456789      todos os anúncios dessa página
  minerador mudou 123456789            o que ela ligou e desligou desde a última vez
  minerador anuncio 1234567890         um anúncio completo, com todas as copys

${cor.negrito("Outros")}
  minerador abrir moldes               abre a busca no seu navegador
  minerador testar                     confere se está tudo instalado
  minerador ajuda                      mostra esta tela
`;

function avisarBusca(backend: Backend, oQue: string): void {
  const demora = backend.name === "browser" ? " (leva uns 30 a 60 segundos)" : "";
  process.stderr.write(cor.fraco(`Buscando ${oQue}…${demora}\n`));
}

function paisDe(opcoes: Opcoes): string {
  return opcoes.pais ?? defaultCountry();
}

function abrirNoNavegador(url: string): void {
  const [cmd, args] =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : process.platform === "darwin"
        ? ["open", [url]]
        : ["xdg-open", [url]];
  try {
    spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
  } catch {
    // Printing the link below is enough when no browser can be started.
  }
}

async function salvarPlanilha(nome: string, conteudo: string): Promise<string> {
  const data = new Date().toISOString().slice(0, 10);
  const slug = nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const caminho = resolve(`minerador-${slug || "busca"}-${data}.csv`);
  await writeFile(caminho, conteudo, "utf8");
  return caminho;
}

function explicarErro(erro: unknown): string {
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  const dica = erro instanceof AdLibraryError ? erro.hint : undefined;
  const baixo = `${mensagem} ${dica ?? ""}`.toLowerCase();
  if (baixo.includes("playwright") || baixo.includes("chromium") || baixo.includes("executable")) {
    return "O navegador interno não está instalado. Rode: npx playwright install chromium";
  }
  if (baixo.includes("timeout")) return "A Biblioteca demorou demais pra responder. Tente de novo em alguns minutos.";
  if (baixo.includes("captcha")) return traduzirAviso("captcha");
  return `${mensagem}${dica ? `\n${dica}` : ""}`;
}

async function main(): Promise<number> {
  const pedido = lerPedido(process.argv.slice(2));

  if (pedido.tipo === "ajuda") {
    process.stdout.write(`${AJUDA}\n`);
    return 0;
  }
  if (pedido.tipo === "erro") {
    process.stderr.write(`${cor.vermelho(pedido.mensagem)}\n`);
    return 2;
  }
  if (pedido.tipo === "testar") {
    const { app } = await import("./app.js");
    return app.runCli(["doctor"], { bin: app.bins.cli });
  }
  if (pedido.tipo === "abrir") {
    const pais = paisDe(pedido.opcoes);
    const url = buildUrl({ query: pedido.termo, country: pais, mediaType: pedido.opcoes.soVideos ? "video" : "all" });
    abrirNoNavegador(url);
    process.stdout.write(`Abrindo "${pedido.termo}" (${nomePais(pais)}) no navegador:\n${url}\n`);
    return 0;
  }

  const config = loadConfig();
  const backend = createBackend(config);
  const store = new SnapshotStore(config.storeDir);

  try {
    switch (pedido.tipo) {
      case "buscar":
      case "concorrente": {
        const { opcoes } = pedido;
        const pais = paisDe(opcoes);
        const ehPagina = pedido.tipo === "concorrente";
        avisarBusca(backend, ehPagina ? `os anúncios da página ${pedido.pageId}` : `"${pedido.termo}" ${noPais(pais)}`);
        const resultado = await backend.search({
          ...(ehPagina ? { pageId: pedido.pageId } : { query: pedido.termo }),
          country: pais,
          activeStatus: opcoes.todos ? "all" : "active",
          mediaType: opcoes.soVideos ? "video" : "all",
          limit: opcoes.quantidade ?? QUANTIDADE_PADRAO,
        });
        if (ehPagina && resultado.ads.length > 0) await store.record(pedido.pageId, resultado.ads);

        const titulo = ehPagina ? `Página ${resultado.ads[0]?.pageName ?? pedido.pageId}` : `"${pedido.termo}"`;
        process.stdout.write(
          `${mostrarBusca(titulo, pais, resultado.ads, { total: resultado.totalAvailable, aviso: resultado.note, url: resultado.url })}\n`,
        );
        if (opcoes.planilha && resultado.ads.length > 0) {
          const caminho = await salvarPlanilha(ehPagina ? `pagina-${pedido.pageId}` : pedido.termo, planilhaCsv(resultado.ads));
          process.stdout.write(`\n📊 Planilha salva em: ${caminho}\n`);
        }
        return 0;
      }
      case "pagina": {
        const pais = paisDe(pedido.opcoes);
        avisarBusca(backend, `páginas anunciando "${pedido.termo}" ${noPais(pais)}`);
        const paginas = await backend.listAdvertisers(pedido.termo, pais);
        process.stdout.write(`${mostrarPaginas(pedido.termo, pais, paginas)}\n`);
        return 0;
      }
      case "anuncio": {
        const pais = paisDe(pedido.opcoes);
        avisarBusca(backend, `o anúncio ${pedido.libraryId}`);
        const ad = await backend.getAd(pedido.libraryId, pais);
        if (!ad) {
          process.stdout.write(`${cor.amarelo("Não achei esse anúncio. Ele pode ter saído do ar, ou o número está errado.")}\n`);
          return 3;
        }
        process.stdout.write(`${mostrarAnuncio(ad)}\n`);
        return 0;
      }
      case "mudou": {
        const pais = paisDe(pedido.opcoes);
        avisarBusca(backend, `os anúncios da página ${pedido.pageId}`);
        const antes = await store.snapshot(pedido.pageId);
        const resultado = await backend.search({ pageId: pedido.pageId, country: pais, activeStatus: "all", limit: pedido.opcoes.quantidade ?? 60 });
        await store.record(pedido.pageId, resultado.ads);
        process.stdout.write(`${mostrarMudancas(pedido.pageId, antes, resultado.ads)}\n`);
        return 0;
      }
    }
  } catch (erro) {
    process.stderr.write(`\n${cor.vermelho("Não deu certo:")} ${explicarErro(erro)}\n`);
    return erro instanceof AdLibraryError ? 5 : 1;
  } finally {
    await backend.close().catch(() => undefined);
  }
}

process.exitCode = await main();
