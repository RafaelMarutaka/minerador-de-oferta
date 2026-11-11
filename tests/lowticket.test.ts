import { describe, expect, it } from "vitest";
import type { Ad } from "../src/adlibrary/types.js";
import { avaliarLowTicket } from "../src/simples/lowticket.js";

const ad = (over: Partial<Ad>): Ad => ({
  libraryId: "1", adDetailsUrl: "", pageCategories: [], platforms: [], countries: [], categories: [], creatives: [], source: "browser", ...over,
});

describe("avaliarLowTicket", () => {
  it("keeps a PDF pack sold on WhatsApp", () => {
    const r = avaliarLowTicket(ad({ linkUrl: "https://api.whatsapp.com/send?phone=55", body: "+500 moldes de roupas pet em PDF pra imprimir. Por apenas R$ 10!" }));
    expect(r.lowTicket).toBe(true);
    expect(r.sinais.join(" ")).toContain("WhatsApp");
    expect(r.sinais.join(" ")).toContain("preço baixo");
  });

  it("keeps a cheap course on a Hotmart or quick page", () => {
    expect(avaliarLowTicket(ad({ linkDomain: "pay.hotmart.com", body: "Curso de moldes em videoaulas" })).lowTicket).toBe(true);
    expect(avaliarLowTicket(ad({ linkDomain: "fichas.netlify.app", body: "Fichas de revisão em PDF" })).lowTicket).toBe(true);
  });

  it("drops store catalogs, marketplaces, big software and apps", () => {
    expect(avaliarLowTicket(ad({ displayFormat: "DPA", linkDomain: "m.shein.com", body: "Ofertas quentes de hoje" })).lowTicket).toBe(false);
    expect(avaliarLowTicket(ad({ linkDomain: "mercadolivre.com.br", body: "Compre no Mercado Livre" })).lowTicket).toBe(false);
    expect(avaliarLowTicket(ad({ linkDomain: "adobe.com", body: "Edite qualquer PDF com o Acrobat" })).lowTicket).toBe(false);
    expect(avaliarLowTicket(ad({ linkDomain: "app.adjust.com", ctaText: "Baixar", body: "Identifica patrones de costura" })).lowTicket).toBe(false);
    expect(avaliarLowTicket(ad({ body: "{{product.brand}}", linkDomain: "loja.com" })).lowTicket).toBe(false);
  });

  it("drops physical products even when sold on WhatsApp", () => {
    const r = avaliarLowTicket(ad({ linkUrl: "https://wa.me/55", body: "Modelagem com margem de costura e envio pelos Correios" }));
    expect(r.lowTicket).toBe(false);
    expect(r.sinais).toContain("produto físico ou presencial");
  });

  it("drops a giant page", () => {
    expect(avaliarLowTicket(ad({ pageLikes: 5_000_000, linkUrl: "https://wa.me/55", body: "kit de moldes" })).lowTicket).toBe(false);
  });

  it("does not take an R$ 197 course as a low price", () => {
    const r = avaliarLowTicket(ad({ body: "Curso completo por R$ 197" }));
    expect(r.sinais).not.toContain("preço baixo na copy");
  });
});
