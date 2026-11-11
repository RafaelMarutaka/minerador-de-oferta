<div align="center">

# ⛏️ Minerador de Oferta

**Descubra o que está rodando de verdade nos anúncios do Facebook e do Instagram.**

Digite uma palavra, escolha o país e veja todos os anúncios ativos daquele nicho:<br>
a copy, o vídeo, pra onde o anúncio leva e há quanto tempo ele está no ar.

![Node](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)
![Windows](https://img.shields.io/badge/Windows-pronto-0078D4?logo=windows&logoColor=white)
![Grátis](https://img.shields.io/badge/custo-grátis-2EA043)
![País](https://img.shields.io/badge/país%20padrão-Brasil-009C3B)

</div>

---

## ✨ O que ele faz

Ele lê a **Biblioteca de Anúncios da Meta**, que é pública, e te entrega tudo organizado.

| Você quer saber… | O minerador mostra |
|---|---|
| 🔎 Quem está anunciando no meu nicho? | Todos os anúncios ativos com a palavra que você buscar |
| 🎬 Qual é o criativo? | O link do vídeo em HD ou das imagens |
| ✍️ Qual é a copy? | O texto do anúncio, com todas as variações |
| 🔗 Pra onde o anúncio leva? | O link real (WhatsApp, página de vendas…) |
| 📅 Esse anúncio está funcionando? | Há quantos dias ele está no ar |
| 📈 Essa oferta está escalando? | Quantas cópias do mesmo criativo estão rodando |
| 🔄 O que mudou no concorrente? | O que ele ligou e desligou desde a última vez |

> 💡 **Não precisa de login, de conta de anúncio nem de pagar nada.** Ele só lê o que a própria Meta já deixa público.

---

## 🚀 Começando em 3 passos

Você só precisa ter o [Node.js](https://nodejs.org) (versão 22 ou mais nova) e o [Git](https://git-scm.com) instalados. Depois abra o **PowerShell** e siga:

**1. Baixe o projeto**

```powershell
git clone https://github.com/RafaelMarutaka/minerador-de-oferta.git
cd minerador-de-oferta
```

**2. Instale**

```powershell
npm install
npm run build
npx playwright install chromium
npm link
```

**3. Confira se está tudo certo**

```powershell
minerador-cli doctor
```

Se aparecer que encontrou anúncios, está pronto. 🎉

---

## 🧭 Como usar

Todos os comandos começam com `minerador-cli`. Os mais usados:

**Buscar anúncios de um nicho**

```powershell
minerador-cli search-ads --query "moldes"
```

**Buscar em outro país** (MX = México, AR = Argentina, US = Estados Unidos…)

```powershell
minerador-cli search-ads --query "plantillas" --country MX
```

**Ver todos os anúncios de um concorrente**

```powershell
minerador-cli list-advertisers --query "nome da página"
minerador-cli search-ads --page-id 123456789
```

O primeiro comando acha o número da página. O segundo usa esse número pra trazer só os anúncios dela.

**Abrir um anúncio completo**

```powershell
minerador-cli get-ad --library-id 1234567890
```

**Ver o que o concorrente mudou**

```powershell
minerador-cli diff-advertiser --page-id 123456789
```

Na primeira vez ele só "tira uma foto". Rodando de novo depois, ele mostra o que entrou e o que saiu.

**Abrir a busca no navegador**

```powershell
minerador-cli ad-library-url --query "moldes"
```

> 🧩 Esqueceu um comando? Digite só `minerador-cli` pra ver a lista, ou `minerador-cli search-ads --help` pra ver as opções de um deles.

---

## 🧠 Como ler os resultados

**📅 Tempo no ar é o melhor sinal.** Ninguém deixa um anúncio que dá prejuízo rodando por meses. Se ele está no ar há muito tempo, provavelmente está vendendo.

**📈 Muitas cópias do mesmo criativo = oferta escalando.** Quando o anunciante duplica o mesmo vídeo pra vários públicos, é porque ele está apostando dinheiro naquilo.

**⚠️ O que não existe em lugar nenhum:** vendas, faturamento e lucro de concorrente. Ninguém tem esses dados, nem ferramenta paga. O que dá pra fazer é ler os sinais acima.

**⚠️ Gasto e alcance vêm vazios no Brasil e no México.** A Meta só mostra esses números pra anúncios na Europa e anúncios políticos. Vazio aqui é normal, não é erro.

---

## 🛟 Deu algum problema?

| O que aconteceu | O que fazer |
|---|---|
| A busca voltou vazia várias vezes | A Meta pausou suas buscas por um tempo. Espere alguns minutos |
| Apareceu erro de Chromium | Rode `npx playwright install chromium` de novo |
| Quero ver o navegador trabalhando | Rode `$env:FBADS_HEADED=1` antes do comando |
| `minerador-cli` não é reconhecido | Rode `npm link` de novo dentro da pasta do projeto |

---

## 🤖 Usar dentro do Claude

Dá pra pedir as buscas direto no chat do **Claude Desktop**. Abra o arquivo `%APPDATA%\Claude\claude_desktop_config.json` e coloque:

```json
{
  "mcpServers": {
    "minerador": {
      "command": "minerador-mcp"
    }
  }
}
```

Feche o Claude Desktop por completo e abra de novo. Aí é só pedir: *"minera anúncios de moldes no México"*.

---

<details>
<summary><b>⚙️ Configurações avançadas</b> (opcional, tudo funciona sem mexer aqui)</summary>

<br>

No PowerShell, uma configuração é ligada assim: `$env:FBADS_COUNTRY="MX"`.

| Variável | Padrão | Pra que serve |
|---|---|---|
| `FBADS_COUNTRY` | `BR` | País usado quando você não diz nenhum |
| `FBADS_BACKEND` | `browser` | `browser` é grátis. `scrapecreators` e `apify` são pagos e mais rápidos |
| `SCRAPECREATORS_API_KEY` | | Chave do modo `scrapecreators` (também libera transcrição de vídeo) |
| `APIFY_TOKEN` | | Token do modo `apify` |
| `APIFY_ACTOR` | `lite` | `full` usa o robô maior da Apify |
| `META_ADS_ARCHIVE_TOKEN` | | Libera gasto e alcance de anúncios na Europa (token grátis da Meta) |
| `META_GRAPH_VERSION` | | Versão da API da Meta usada com o token acima |
| `FBADS_HEADED` | desligado | `1` mostra o navegador enquanto ele busca |
| `FBADS_HYDRATE_MS` | `9000` | Quanto tempo esperar a página carregar |
| `FBADS_SCROLL_WAIT_MS` | `4000` | Pausa entre uma rolagem e outra |
| `FBADS_RETRIES` | `1` | Quantas vezes tentar de novo quando volta vazio |
| `FBADS_CACHE_DAYS` | `1` | Por quantos dias reaproveitar uma busca paga |
| `FBADS_STORE_DIR` | pasta do app | Onde ficam as "fotos" do comparador de concorrentes |
| `FBADS_HTTP_PORT` | `8787` | Porta do modo servidor (`--http`) |
| `FBADS_HTTP_HOST` | `127.0.0.1` | Endereço do modo servidor |
| `FBADS_HTTP_TOKEN` | | Senha de acesso do modo servidor |
| `FBADS_HTTP_ALLOWED_ORIGINS` | | Sites que podem se conectar ao modo servidor |
| `FBADS_SURFACE` | `full` | `search` mostra menos ferramentas pro Claude |
| `FBADS_TOOL_TIMEOUT_MS` | | Tempo máximo de cada busca |
| `FBADS_DEBUG` | `0` | `1` mostra mensagens técnicas |

</details>

<details>
<summary><b>🛠️ Todos os comandos</b></summary>

<br>

| Comando | O que faz |
|---|---|
| `search-ads` | Busca anúncios por palavra ou por página |
| `list-advertisers` | Acha o número das páginas que anunciam com uma palavra |
| `get-ad` | Mostra um anúncio completo |
| `view-ad-creative` | Mostra as imagens de um anúncio |
| `diff-advertiser` | Mostra o que uma página ligou e desligou |
| `transcribe-ad` | Transcreve o áudio de um vídeo (só no modo pago `scrapecreators`) |
| `get-eu-transparency` | Gasto e alcance (só Europa e anúncios políticos) |
| `ad-library-url` | Gera o link da busca pra abrir no navegador |
| `backend-status` | Mostra qual modo está ligado e se custa dinheiro |
| `doctor` | Testa se a instalação está funcionando |

Opções úteis em qualquer comando: `--json` (resultado em JSON), `--limit 40` (quantos anúncios trazer) e `--select ads.library_id,ads.days_active` (só os campos que você quer).

**Códigos de saída** (pra quem usa em script): `0` deu certo, `1` erro inesperado, `2` comando errado, `3` não encontrado, `4` chave recusada, `5` falha na Meta ou no navegador, `7` sem crédito ou limite atingido, `10` modo não configurado.

</details>

<details>
<summary><b>☁️ Rodar na nuvem</b> (pra depois)</summary>

<br>

O projeto já vem com um `Dockerfile` que inclui o navegador. Num servidor:

```bash
npm install && npm run build
docker build -t minerador .
docker run -p 8787:8787 -e FBADS_HTTP_TOKEN=uma-senha-sua minerador
```

</details>

<details>
<summary><b>📁 Como o projeto é organizado</b></summary>

<br>

```
src/              o minerador: buscas, leitura da Biblioteca e comandos
packages/nucleo/  o núcleo que transforma as ferramentas em comandos e no servidor do Claude
tests/            testes automáticos (npm test)
licenses/         avisos de licença dos componentes
```

</details>

---

<div align="center">

Feito por **Rafael Marutaka** · Licença MIT

<sub>Não tem ligação com a Meta Platforms, Inc.</sub>

</div>
