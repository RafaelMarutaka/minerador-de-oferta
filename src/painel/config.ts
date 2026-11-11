/**
 * Where the panel's settings live, and how they are read.
 *
 * The Supabase secret key stays on this computer only: in a file in the user's
 * app-data folder, or in MINERADOR_SUPABASE_KEY. It never reaches the browser;
 * the panel's page talks to the local server, and only the server talks to
 * Supabase.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type ConfigPainel = {
  supabaseUrl: string;
  supabaseKey: string;
  /** Ads collected per search. */
  quantidade: number;
  /** Where saved videos go. */
  pastaVideos: string;
};

export const URL_PADRAO = "https://suixpajedtbwnamefzml.supabase.co";

export function pastaApp(env: NodeJS.ProcessEnv = process.env): string {
  if (env["MINERADOR_PASTA"]) return env["MINERADOR_PASTA"];
  if (process.platform === "win32") return join(env["APPDATA"] ?? homedir(), "minerador-de-oferta");
  if (process.platform === "darwin") return join(homedir(), "Library", "Application Support", "minerador-de-oferta");
  return join(env["XDG_CONFIG_HOME"] ?? join(homedir(), ".config"), "minerador-de-oferta");
}

export const arquivoConfig = (env: NodeJS.ProcessEnv = process.env): string => join(pastaApp(env), "config.json");

type Salvo = Partial<Pick<ConfigPainel, "supabaseUrl" | "supabaseKey" | "quantidade" | "pastaVideos">>;

export async function lerConfigSalva(env: NodeJS.ProcessEnv = process.env): Promise<Salvo> {
  try {
    return JSON.parse(await readFile(arquivoConfig(env), "utf8")) as Salvo;
  } catch {
    return {};
  }
}

export async function salvarConfig(novo: Salvo, env: NodeJS.ProcessEnv = process.env): Promise<string> {
  const atual = await lerConfigSalva(env);
  const caminho = arquivoConfig(env);
  await mkdir(dirname(caminho), { recursive: true });
  await writeFile(caminho, JSON.stringify({ ...atual, ...novo }, null, 2), { encoding: "utf8", mode: 0o600 });
  return caminho;
}

export class SemConfiguracao extends Error {
  constructor() {
    super("O painel ainda não está ligado ao banco. Rode: minerador configurar");
  }
}

export async function carregarConfig(env: NodeJS.ProcessEnv = process.env): Promise<ConfigPainel> {
  const salvo = await lerConfigSalva(env);
  const supabaseKey = env["MINERADOR_SUPABASE_KEY"] || salvo.supabaseKey;
  if (!supabaseKey) throw new SemConfiguracao();
  const quantidade = Number.parseInt(env["MINERADOR_QUANTIDADE"] ?? "", 10);
  return {
    supabaseUrl: env["MINERADOR_SUPABASE_URL"] || salvo.supabaseUrl || URL_PADRAO,
    supabaseKey,
    quantidade: Number.isFinite(quantidade) && quantidade > 0 ? Math.min(quantidade, 200) : (salvo.quantidade ?? 50),
    pastaVideos: env["MINERADOR_PASTA_VIDEOS"] || salvo.pastaVideos || join(homedir(), "Minerador", "videos"),
  };
}
