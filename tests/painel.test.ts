import { request } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Ad } from "../src/adlibrary/types.js";
import { lerPedido } from "../src/simples/args.js";
import { SCRIPT_ATALHO, argumentosSchtasks, horarioValido } from "../src/painel/agendar.js";
import { hoje, linhaAnuncio, linhaPagina, semRepetir } from "../src/painel/banco.js";
import { filtrarBuscas, pausaEntreBuscas } from "../src/painel/coletar.js";
import { iniciarPainel, nomeArquivoVideo } from "../src/painel/servidor.js";

const ad = (over: Partial<Ad>): Ad => ({
  libraryId: "10", adDetailsUrl: "https://www.facebook.com/ads/library/?id=10", pageCategories: [], platforms: ["Facebook"],
  countries: [], categories: [], creatives: [], source: "browser", ...over,
});

describe("linhas do banco", () => {
  it("maps an ad to the columns the collector owns, leaving saved and notes alone", () => {
    const linha = linhaAnuncio(
      ad({ pageId: "5", body: "copy", daysActive: 40, variantsUsingCreative: 3, ctaText: "Learn more", startedRunning: "2026-09-01T00:00:00Z",
        creatives: [{ kind: "video", videoHdUrl: "https://v/hd.mp4", previewImageUrl: "https://i/p.jpg", linkUrl: "https://wa.me/55" }] }),
      "MX", "2026-11-11T00:00:00Z");
    expect(linha).toMatchObject({ library_id: "10", page_id: "5", pais: "MX", botao: "Saiba mais", destino: "WhatsApp", copias: 3, dias_no_ar: 40,
      inicio: "2026-09-01", video_url: "https://v/hd.mp4", imagem_url: "https://i/p.jpg", link_url: "https://wa.me/55", formato: "Vídeo" });
    expect(linha).not.toHaveProperty("salvo");
    expect(linha).not.toHaveProperty("nota");
    expect(linha).not.toHaveProperty("primeira_vez");
  });

  it("maps a page and keeps one row per key", () => {
    expect(linhaPagina(ad({ pageId: "5", pageName: "Loja" }), "t")).toMatchObject({ page_id: "5", nome: "Loja" });
    expect(semRepetir([{ k: "a", v: 1 }, { k: "a", v: 2 }, { k: "b", v: 3 }], (x) => x.k)).toEqual([{ k: "a", v: 2 }, { k: "b", v: 3 }]);
  });

  it("writes today as the computer sees it", () => {
    expect(hoje(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});

describe("coleta e agenda", () => {
  it("filters searches by word or niche and pauses 15 to 30 seconds", () => {
    const buscas = [
      { id: 1, termo: "moldes de costura", pais: "BR", nicho: "Costura", ativa: true, criada_em: "" },
      { id: 2, termo: "santa missa", pais: "BR", nicho: "Católico", ativa: true, criada_em: "" },
    ];
    expect(filtrarBuscas(buscas, "moldes").map((b) => b.id)).toEqual([1]);
    expect(filtrarBuscas(buscas, "católico").map((b) => b.id)).toEqual([2]);
    expect(filtrarBuscas(buscas).length).toBe(2);
    expect(pausaEntreBuscas(() => 0)).toBe(15_000);
    expect(pausaEntreBuscas(() => 1)).toBe(30_000);
  });

  it("reads a time the way people write it", () => {
    expect(horarioValido("9")).toBe("09:00");
    expect(horarioValido("9:30")).toBe("09:30");
    expect(horarioValido("21h")).toBe("21:00");
    expect(horarioValido("7h15")).toBe("07:15");
    expect(horarioValido("25:00")).toBeUndefined();
  });

  it("builds the Windows task with this Node and this file", () => {
    const args = argumentosSchtasks("09:00", { node: "C:\\Program Files\\nodejs\\node.exe", script: "C:\\m\\dist\\minerador.js" });
    expect(args).toEqual(["/Create", "/TN", "Minerador de Oferta", "/TR", '"C:\\Program Files\\nodejs\\node.exe" "C:\\m\\dist\\minerador.js" coletar --log', "/SC", "DAILY", "/ST", "09:00", "/F"]);
  });

  it("builds a desktop shortcut that opens the panel minimized", () => {
    expect(SCRIPT_ATALHO).toContain("Minerador de Oferta.lnk");
    expect(SCRIPT_ATALHO).toContain("$s.WindowStyle = 7");
    expect(SCRIPT_ATALHO).toContain("painel");
    expect(lerPedido(["atalho"])).toEqual({ tipo: "atalho" });
  });

  it("parses the panel commands", () => {
    expect(lerPedido(["coletar"])).toMatchObject({ tipo: "coletar" });
    expect(lerPedido(["coletar", "moldes", "--log"])).toMatchObject({ tipo: "coletar", filtro: "moldes", opcoes: { log: true } });
    expect(lerPedido(["agendar"])).toEqual({ tipo: "agendar", horario: "09:00" });
    expect(lerPedido(["agendar", "21h"])).toEqual({ tipo: "agendar", horario: "21h" });
    expect(lerPedido(["painel"])).toEqual({ tipo: "painel" });
    expect(lerPedido(["configurar"])).toEqual({ tipo: "configurar" });
  });

  it("names a saved video safely", () => {
    expect(nomeArquivoVideo("Ateliê da Ana / Moldes", "123")).toBe("Atelie-da-Ana-Moldes-123.mp4");
    expect(nomeArquivoVideo(undefined, "9")).toBe("anuncio-9.mp4");
  });
});

describe("servidor do painel", () => {
  const porta = 43_000 + Math.floor(Math.random() * 1000);
  let fechar: () => Promise<void>;
  const base = `http://127.0.0.1:${porta}`;

  beforeAll(async () => {
    process.env["MINERADOR_SUPABASE_KEY"] = "teste";
    process.env["MINERADOR_SUPABASE_URL"] = "http://127.0.0.1:9";
    ({ fechar } = await iniciarPainel(porta));
  });
  afterAll(async () => {
    await fechar();
    delete process.env["MINERADOR_SUPABASE_KEY"];
    delete process.env["MINERADOR_SUPABASE_URL"];
  });

  it("serves the page with a content security policy", async () => {
    const r = await fetch(`${base}/`);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-security-policy")).toContain("connect-src 'self'");
    expect(await r.text()).toContain("Minerador de Oferta");
  });

  it("refuses requests addressed to another host name", async () => {
    // fetch will not let a test change Host, so this goes through node:http.
    const status = await new Promise<number>((resolve, reject) => {
      const req = request({ host: "127.0.0.1", port: porta, path: "/", headers: { host: "evil.example" } }, (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      });
      req.on("error", reject);
      req.end();
    });
    expect(status).toBe(403);
  });

  it("refuses changes without the panel's own header", async () => {
    const r = await fetch(`${base}/api/buscas`, { method: "POST", body: JSON.stringify({ termo: "x" }), headers: { "content-type": "application/json" } });
    expect(r.status).toBe(403);
  });

  it("answers an unknown route with 404", async () => {
    expect((await fetch(`${base}/api/nada`)).status).toBe(404);
  });
});
