import { describe, expect, it } from "vitest";
import type { Ad } from "../src/adlibrary/types.js";
import { codigoPais, lerPedido } from "../src/simples/args.js";
import { destino, formato, mostrarBusca, mostrarMudancas, ordenarPorForca, planilhaCsv, rankingPaginas } from "../src/simples/mostrar.js";

const ad = (over: Partial<Ad>): Ad => ({
  libraryId: "1",
  adDetailsUrl: "https://www.facebook.com/ads/library/?id=1",
  pageCategories: [],
  platforms: [],
  countries: [],
  categories: [],
  creatives: [],
  source: "browser",
  ...over,
});

describe("lerPedido", () => {
  it("treats plain words as a search, with no quotes needed", () => {
    expect(lerPedido(["moldes", "de", "costura"])).toMatchObject({ tipo: "buscar", termo: "moldes de costura" });
  });

  it("reads the country as --mx, --pais mx or --pais mexico", () => {
    expect(lerPedido(["plantillas", "--mx"])).toMatchObject({ opcoes: { pais: "MX" } });
    expect(lerPedido(["plantillas", "--pais", "mx"])).toMatchObject({ opcoes: { pais: "MX" } });
    expect(lerPedido(["plantillas", "--pais", "México"])).toMatchObject({ opcoes: { pais: "MX" } });
  });

  it("reads quantity, videos and spreadsheet", () => {
    expect(lerPedido(["moldes", "-n", "60", "--videos", "--planilha"])).toMatchObject({
      tipo: "buscar",
      opcoes: { quantidade: 60, soVideos: true, planilha: true },
    });
  });

  it("knows the other commands, with or without accents", () => {
    expect(lerPedido(["página", "Moldes", "da", "Ana"])).toMatchObject({ tipo: "pagina", termo: "Moldes da Ana" });
    expect(lerPedido(["concorrente", "123456789"])).toMatchObject({ tipo: "concorrente", pageId: "123456789" });
    expect(lerPedido(["mudou", "123456789"])).toMatchObject({ tipo: "mudou", pageId: "123456789" });
    expect(lerPedido(["anuncio", "https://www.facebook.com/ads/library/?id=1234567890"])).toMatchObject({ tipo: "anuncio", libraryId: "1234567890" });
    expect(lerPedido(["testar"])).toEqual({ tipo: "testar" });
    expect(lerPedido([])).toEqual({ tipo: "ajuda" });
  });

  it("explains what went wrong instead of guessing", () => {
    expect(lerPedido(["concorrente", "Moldes da Ana"])).toMatchObject({ tipo: "erro" });
    expect(lerPedido(["moldes", "-n", "999"])).toMatchObject({ tipo: "erro" });
    expect(lerPedido(["moldes", "--inventada"])).toMatchObject({ tipo: "erro" });
    expect(lerPedido(["pagina"])).toMatchObject({ tipo: "erro" });
  });

  it("maps country names and codes", () => {
    expect(codigoPais("brasil")).toBe("BR");
    expect(codigoPais("co")).toBe("CO");
    expect(codigoPais("narnia")).toBeUndefined();
  });
});

describe("mostrar", () => {
  const ads = [
    ad({ libraryId: "a", pageId: "1", pageName: "Loja A", daysActive: 3, variantsUsingCreative: 1 }),
    ad({ libraryId: "b", pageId: "2", pageName: "Loja B", daysActive: 120, variantsUsingCreative: 8, linkUrl: "https://wa.me/5511" }),
    ad({ libraryId: "c", pageId: "2", pageName: "Loja B", daysActive: 40, variantsUsingCreative: 8 }),
  ];

  it("puts the strongest offer first", () => {
    expect(ordenarPorForca(ads).map((a) => a.libraryId)).toEqual(["b", "c", "a"]);
  });

  it("ranks the pages that appear most", () => {
    expect(rankingPaginas(ads)[0]).toMatchObject({ nome: "Loja B", anuncios: 2, maisAntigo: 120 });
  });

  it("names where an ad leads and its format", () => {
    expect(destino(ads[1]!)).toBe("WhatsApp");
    expect(destino(ad({ linkDomain: "www.minhapagina.com" }))).toBe("minhapagina.com");
    expect(formato(ad({ creatives: [{ kind: "video", videoHdUrl: "x" }] }))).toBe("Vídeo");
  });

  it("prints a readable search in Portuguese", () => {
    const texto = mostrarBusca('"moldes"', "BR", ads, { total: 900 });
    expect(texto).toContain("Brasil");
    expect(texto).toContain("Páginas que mais aparecem");
    expect(texto).toContain("120 dias no ar");
    expect(texto).toContain("8 cópias do criativo");
  });

  it("explains an empty search", () => {
    expect(mostrarBusca('"xyz"', "MX", [], { aviso: "Meta served a captcha" })).toContain("captcha");
  });

  it("reports a first look as a baseline, and later what started and stopped", () => {
    expect(mostrarMudancas("2", new Map(), ads)).toContain("Primeira vez");
    const antes = new Map([["old", { ...ad({ libraryId: "old" }), firstSeen: 0, lastSeen: 0 }]]);
    const texto = mostrarMudancas("2", antes, ads);
    expect(texto).toContain("Começaram a rodar: 3");
    expect(texto).toContain("Não aparecem mais: 1");
  });

  it("writes a spreadsheet Excel opens with accents", () => {
    const csv = planilhaCsv(ads);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.split("\r\n")[1]).toContain('"Loja B"');
  });
});
