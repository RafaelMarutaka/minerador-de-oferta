/**
 * Turns what a person types after `minerador` into one request.
 *
 * Forgiving on purpose: `minerador moldes`, `minerador moldes de costura --mx`,
 * `minerador plantillas --pais mexico -n 50` and `minerador pagina "Moldes da Ana"`
 * all work, with no quotes needed around a search of several words.
 */

export type Pedido =
  | { tipo: "buscar"; termo: string; opcoes: Opcoes }
  | { tipo: "pagina"; termo: string; opcoes: Opcoes }
  | { tipo: "concorrente"; pageId: string; opcoes: Opcoes }
  | { tipo: "anuncio"; libraryId: string; opcoes: Opcoes }
  | { tipo: "mudou"; pageId: string; opcoes: Opcoes }
  | { tipo: "abrir"; termo: string; opcoes: Opcoes }
  | { tipo: "testar" }
  | { tipo: "configurar" }
  | { tipo: "coletar"; filtro?: string; opcoes: Opcoes }
  | { tipo: "painel" }
  | { tipo: "agendar"; horario: string }
  | { tipo: "desagendar" }
  | { tipo: "ajuda" }
  | { tipo: "erro"; mensagem: string };

export type Opcoes = {
  pais?: string;
  quantidade?: number;
  soVideos: boolean;
  todos: boolean;
  planilha: boolean;
  log: boolean;
};

const PAISES: Record<string, string> = {
  brasil: "BR", brazil: "BR",
  mexico: "MX", "méxico": "MX",
  argentina: "AR",
  colombia: "CO", "colômbia": "CO",
  chile: "CL",
  peru: "PE", "perú": "PE",
  equador: "EC", ecuador: "EC",
  uruguai: "UY", uruguay: "UY",
  paraguai: "PY", paraguay: "PY",
  bolivia: "BO", "bolívia": "BO",
  venezuela: "VE",
  guatemala: "GT",
  "costa rica": "CR", costarica: "CR",
  panama: "PA", "panamá": "PA",
  "republica dominicana": "DO", dominicana: "DO",
  eua: "US", usa: "US", "estados unidos": "US",
  espanha: "ES", "españa": "ES", espana: "ES",
  portugal: "PT",
};

/** BR, br, "mexico", "México" all become a two-letter code; anything else is undefined. */
export function codigoPais(texto: string): string | undefined {
  const limpo = texto.trim().toLowerCase();
  if (/^[a-z]{2}$/.test(limpo)) return limpo.toUpperCase();
  return PAISES[limpo];
}

export const NOME_PAIS: Record<string, string> = {
  BR: "Brasil", MX: "México", AR: "Argentina", CO: "Colômbia", CL: "Chile", PE: "Peru",
  EC: "Equador", UY: "Uruguai", PY: "Paraguai", BO: "Bolívia", VE: "Venezuela",
  GT: "Guatemala", CR: "Costa Rica", PA: "Panamá", DO: "República Dominicana",
  US: "Estados Unidos", ES: "Espanha", PT: "Portugal",
};

type Comando = Exclude<Pedido["tipo"], "erro">;

const COMANDOS: Record<string, Comando> = {
  buscar: "buscar", busca: "buscar", procurar: "buscar",
  pagina: "pagina", "página": "pagina", paginas: "pagina", "páginas": "pagina",
  concorrente: "concorrente",
  anuncio: "anuncio", "anúncio": "anuncio",
  mudou: "mudou", mudancas: "mudou", "mudanças": "mudou",
  abrir: "abrir", link: "abrir",
  testar: "testar", teste: "testar", doctor: "testar",
  configurar: "configurar", config: "configurar",
  coletar: "coletar", coleta: "coletar",
  painel: "painel",
  agendar: "agendar",
  desagendar: "desagendar",
  ajuda: "ajuda", help: "ajuda", "--help": "ajuda", "-h": "ajuda", "?": "ajuda",
};

export function lerPedido(argv: string[]): Pedido {
  const opcoes: Opcoes = { soVideos: false, todos: false, planilha: false, log: false };
  const palavras: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? "";
    const baixo = arg.toLowerCase();

    if (baixo === "--pais" || baixo === "--país" || baixo === "-p") {
      const valor = argv[++i];
      const codigo = valor ? codigoPais(valor) : undefined;
      if (!codigo) return { tipo: "erro", mensagem: `Não entendi o país "${valor ?? ""}". Use, por exemplo, --pais mx ou --pais mexico.` };
      opcoes.pais = codigo;
    } else if (baixo === "--qtd" || baixo === "-n" || baixo === "--quantidade") {
      const valor = Number.parseInt(argv[++i] ?? "", 10);
      if (!Number.isFinite(valor) || valor < 1 || valor > 200) {
        return { tipo: "erro", mensagem: "A quantidade precisa ser um número de 1 a 200. Exemplo: -n 50" };
      }
      opcoes.quantidade = valor;
    } else if (baixo === "--videos" || baixo === "--vídeos" || baixo === "--video") {
      opcoes.soVideos = true;
    } else if (baixo === "--todos" || baixo === "--parados") {
      opcoes.todos = true;
    } else if (baixo === "--planilha" || baixo === "--csv" || baixo === "--salvar") {
      opcoes.planilha = true;
    } else if (baixo === "--log") {
      opcoes.log = true;
    } else if (/^--[a-z]{2}$/.test(baixo)) {
      opcoes.pais = baixo.slice(2).toUpperCase();
    } else if (baixo.startsWith("-") && !/^-\d/.test(baixo)) {
      return { tipo: "erro", mensagem: `Não conheço a opção "${arg}". Digite: minerador ajuda` };
    } else {
      palavras.push(arg);
    }
  }

  if (palavras.length === 0) return { tipo: "ajuda" };

  const primeira = (palavras[0] ?? "").toLowerCase();
  const comando = COMANDOS[primeira];
  const resto = comando ? palavras.slice(1) : palavras;
  const termo = resto.join(" ").trim();
  const tipo: Comando = comando ?? "buscar";

  if (tipo === "ajuda") return { tipo: "ajuda" };
  if (tipo === "testar") return { tipo: "testar" };
  if (tipo === "configurar") return { tipo: "configurar" };
  if (tipo === "painel") return { tipo: "painel" };
  if (tipo === "desagendar") return { tipo: "desagendar" };
  if (tipo === "coletar") return { tipo: "coletar", filtro: termo || undefined, opcoes };
  if (tipo === "agendar") return { tipo: "agendar", horario: termo || "09:00" };

  if (!termo) {
    const exemplos: Record<string, string> = {
      buscar: "minerador buscar moldes",
      pagina: 'minerador pagina "Moldes da Ana"',
      concorrente: "minerador concorrente 123456789",
      anuncio: "minerador anuncio 1234567890",
      mudou: "minerador mudou 123456789",
      abrir: "minerador abrir moldes",
    };
    return { tipo: "erro", mensagem: `Faltou dizer o quê. Exemplo: ${exemplos[tipo] ?? "minerador moldes"}` };
  }

  if (tipo === "concorrente" || tipo === "mudou") {
    if (!/^\d+$/.test(termo)) {
      return {
        tipo: "erro",
        mensagem: `Aqui vai o número da página, não o nome. Ache o número com: minerador pagina "${termo}"`,
      };
    }
    return { tipo, pageId: termo, opcoes };
  }
  if (tipo === "anuncio") {
    const id = termo.match(/\d{6,}/)?.[0];
    if (!id) return { tipo: "erro", mensagem: "Cole o número do anúncio (ou o link dele da Biblioteca)." };
    return { tipo: "anuncio", libraryId: id, opcoes };
  }
  if (tipo === "pagina" || tipo === "abrir") return { tipo, termo, opcoes };
  return { tipo: "buscar", termo, opcoes };
}
