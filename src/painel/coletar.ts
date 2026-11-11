/**
 * The collector: every active search, one after another, into the database.
 *
 * One browser stays open for the whole run, and there is a pause between
 * searches so Meta does not start refusing them. A captcha stops the run
 * early: carrying on would only collect empty pages.
 */

import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Backend } from "../adlibrary/types.js";
import { createBackend } from "../backends/index.js";
import { loadConfig } from "../config.js";
import { buscasAtivas, conectar, gravarResultado, hoje, registrarColeta, type Busca } from "./banco.js";
import { carregarConfig, pastaApp } from "./config.js";

export type Relato = (linha: string) => void;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function pausaEntreBuscas(aleatorio = Math.random): number {
  return 15_000 + Math.round(aleatorio() * 15_000);
}

export function filtrarBuscas(buscas: Busca[], filtro?: string): Busca[] {
  if (!filtro) return buscas;
  const f = filtro.toLowerCase();
  return buscas.filter((b) => b.termo.toLowerCase().includes(f) || (b.nicho ?? "").toLowerCase().includes(f));
}

export async function coletar(opcoes: { filtro?: string; relato: Relato; pausa?: (ms: number) => Promise<void> }): Promise<{ buscas: number; anuncios: number; falhas: number }> {
  const { relato } = opcoes;
  const pausa = opcoes.pausa ?? esperar;
  const config = await carregarConfig();
  const db = conectar(config);
  const buscas = filtrarBuscas(await buscasAtivas(db), opcoes.filtro);
  if (buscas.length === 0) {
    relato("Nenhuma busca ativa. Adicione palavras no painel (minerador painel) ou confira o filtro.");
    return { buscas: 0, anuncios: 0, falhas: 0 };
  }

  const dia = hoje();
  const backend: Backend = createBackend(loadConfig());
  let anuncios = 0;
  let falhas = 0;
  relato(`Coletando ${buscas.length} busca${buscas.length === 1 ? "" : "s"} (${config.quantidade} anúncios cada).`);

  try {
    for (const [i, busca] of buscas.entries()) {
      const iniciada_em = new Date().toISOString();
      const rotulo = `[${i + 1}/${buscas.length}] "${busca.termo}" (${busca.pais})`;
      try {
        const resultado = await backend.search({ query: busca.termo, country: busca.pais, activeStatus: "active", limit: config.quantidade });
        const gravados = await gravarResultado(db, busca, resultado.ads, dia);
        anuncios += gravados;
        await registrarColeta(db, { busca_id: busca.id, dia, encontrados: gravados, total_meta: resultado.totalAvailable, aviso: resultado.note, iniciada_em });
        relato(`${rotulo}: ${gravados} anúncio${gravados === 1 ? "" : "s"}${resultado.note ? ` (aviso: ${resultado.note})` : ""}`);
        if (resultado.note?.toLowerCase().includes("captcha")) {
          relato("A Meta pediu verificação (captcha). Parei por aqui; o resto fica pra próxima coleta.");
          break;
        }
      } catch (erro) {
        falhas += 1;
        const mensagem = erro instanceof Error ? erro.message : String(erro);
        relato(`${rotulo}: falhou (${mensagem})`);
        await registrarColeta(db, { busca_id: busca.id, dia, erro: mensagem, iniciada_em }).catch(() => undefined);
      }
      if (i < buscas.length - 1) await pausa(pausaEntreBuscas());
    }
  } finally {
    await backend.close().catch(() => undefined);
  }

  relato(`Pronto: ${anuncios} anúncios gravados${falhas ? `, ${falhas} busca${falhas === 1 ? "" : "s"} com erro` : ""}.`);
  return { buscas: buscas.length, anuncios, falhas };
}

/** For scheduled runs: the same lines, with the time, into a log file. */
export async function relatoEmArquivo(): Promise<Relato> {
  const pasta = pastaApp();
  await mkdir(pasta, { recursive: true });
  const arquivo = join(pasta, "coletas.log");
  return (linha) => {
    const texto = `${new Date().toLocaleString("pt-BR")}  ${linha}\n`;
    process.stdout.write(texto);
    void appendFile(arquivo, texto, "utf8").catch(() => undefined);
  };
}
