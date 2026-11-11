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
npm ci
npm run build
npx playwright install chromium
npm link
```

**3. Confira se está tudo certo**

```powershell
minerador testar
```

Se aparecer que encontrou anúncios, está pronto. 🎉

---

## 🧭 Como usar

É só digitar `minerador` e o que você quer procurar. Sem aspas, sem complicação.

```powershell
minerador moldes
```

Pronto. Ele mostra as páginas que mais aparecem e os anúncios do mais forte pro mais fraco:

```
⛏️  "moldes" · Brasil · 30 anúncios

🏆 Páginas que mais aparecem
   1. Ateliê Exemplo — 6 anúncios, o mais antigo com 94 dias no ar

📋 Anúncios, do mais forte pro mais fraco

 1. 🔥 Ateliê Exemplo · 94 dias no ar · 7 cópias do criativo
     Vídeo · Botão: Enviar mensagem · Leva pra: WhatsApp
     "Começo da copy do anúncio…"
     🎬 link do vídeo
     🔗 link do anúncio na Biblioteca
```

### Mais jeitos de buscar

| Quero… | Digito |
|---|---|
| Buscar várias palavras | `minerador moldes de costura` |
| Buscar no México | `minerador plantillas --mx` |
| Buscar em outro país | `--ar` Argentina, `--co` Colômbia, `--cl` Chile, `--us` EUA… |
| Ver só vídeos | `minerador moldes --videos` |
| Trazer mais anúncios | `minerador moldes -n 60` |
| Salvar numa planilha do Excel | `minerador moldes --planilha` |
| Abrir a busca no navegador | `minerador abrir moldes` |

### Espiar um concorrente

| Quero… | Digito |
|---|---|
| Achar o número da página | `minerador pagina Ateliê Exemplo` |
| Ver todos os anúncios dela | `minerador concorrente 123456789` |
| Ver o que ela ligou e desligou | `minerador mudou 123456789` |
| Abrir um anúncio completo | `minerador anuncio 1234567890` |

No `mudou`, a primeira vez só "tira uma foto". Rodando de novo depois de uns dias, ele mostra o que entrou e o que saiu.

> 🧩 Esqueceu algo? Digite `minerador ajuda`.

---

## 📊 Painel de mineração

O painel coleta suas palavras **todo dia sozinho**, guarda o histórico e mostra num site no seu PC quem está escalando.

![Painel](https://img.shields.io/badge/abre%20em-127.0.0.1%3A4321-e8590c)

| Aba | O que mostra |
|---|---|
| 🔥 **Ofertas** | Anúncios do mais forte pro mais fraco, com filtros de nicho, país, destino (WhatsApp ou página), formato e tempo no ar |
| 📈 **Crescendo** | Páginas que mais ganharam anúncios nos últimos dias. É aqui que aparece a oferta escalando |
| 🆕 **Páginas novas** | Quem começou a anunciar nas suas palavras nos últimos 3 dias |
| ⭐ **Salvos** | Seu swipe file. Ao salvar, o vídeo é baixado pro seu PC na hora, com espaço pra anotação |
| 🔎 **Palavras** | Adicione, pause ou remova as palavras que o minerador acompanha |

### Ligando o painel (só uma vez)

**1. Conecte ao banco**

```powershell
minerador configurar
```

Ele mostra o link da página do Supabase onde fica a **chave secreta** (começa com `sb_secret_`). Copie e cole quando pedir. A chave fica guardada só no seu computador.

**2. Faça a primeira coleta**

```powershell
minerador coletar
```

Cada palavra leva de 30 segundos a 1 minuto, com uma pausa entre uma e outra pra Meta não bloquear.

**3. Abra o painel**

```powershell
minerador painel
```

Abre no navegador. Deixe a janela do PowerShell aberta enquanto usa. Pra fechar, `Ctrl+C`.

Pra não precisar do PowerShell no dia a dia, crie um atalho na área de trabalho:

```powershell
minerador atalho
```

Aí é só dar dois cliques em **Minerador de Oferta** na área de trabalho. A janela do painel abre minimizada.

**4. Deixe coletando sozinho todo dia**

```powershell
minerador agendar 9:00
```

Todo dia nesse horário, com o PC ligado, ele coleta tudo sozinho. Pra desligar: `minerador desagendar`. O registro de cada coleta fica no arquivo `coletas.log`.

> 💡 O **Crescendo** precisa de pelo menos duas coletas em dias diferentes pra comparar. Depois de uma semana coletando ele fica bem mais útil.

---

## 🧠 Como ler os resultados

**📅 Tempo no ar é o melhor sinal.** Ninguém deixa um anúncio que dá prejuízo rodando por meses. Se ele está no ar há muito tempo, provavelmente está vendendo.

**📈 Muitas cópias do mesmo criativo = oferta escalando.** Quando o anunciante duplica o mesmo vídeo pra vários públicos, é porque ele está apostando dinheiro naquilo.

**⚠️ O que não existe em lugar nenhum:** vendas, faturamento e lucro de concorrente. Ninguém tem esses dados, nem ferramenta paga. O que dá pra fazer é ler os sinais acima.

**⚠️ Gasto e alcance vêm vazios no Brasil e no México.** A Meta só mostra esses números pra anúncios na Europa e anúncios políticos. Vazio aqui é normal, não é erro.

---

## 🔄 Atualizar o minerador

Quando tiver versão nova no GitHub:

```powershell
cd $HOME\minerador-de-oferta
git pull
npm ci
npm run build
```

---

## 🛟 Deu algum problema?

| O que aconteceu | O que fazer |
|---|---|
| A busca voltou vazia várias vezes | A Meta pausou suas buscas por um tempo. Espere alguns minutos |
| Apareceu erro de Chromium | Rode `npx playwright install chromium` de novo |
| Quero ver o navegador trabalhando | Rode `$env:FBADS_HEADED=1` antes do comando |
| `minerador` não é reconhecido | Rode `npm link` de novo dentro da pasta do projeto |

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
| `MINERADOR_SUPABASE_KEY` | | Chave secreta do Supabase (em vez de usar `minerador configurar`) |
| `MINERADOR_SUPABASE_URL` | projeto do minerador | Endereço do banco, se um dia trocar de projeto |
| `MINERADOR_QUANTIDADE` | `50` | Quantos anúncios coletar por palavra |
| `MINERADOR_PASTA_VIDEOS` | `Minerador\videos` | Onde salvar os vídeos dos anúncios salvos |
| `MINERADOR_PASTA` | pasta do app | Onde ficam a configuração e o `coletas.log` |

</details>

<details>
<summary><b>🛠️ Comandos avançados</b> (<code>minerador-cli</code>, pra scripts e JSON)</summary>

<br>

O `minerador` é o jeito fácil. Por trás dele existe o `minerador-cli`, que devolve os dados crus em JSON pra quem quer automatizar:

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

Comandos do painel: `minerador configurar`, `minerador coletar [palavra]`, `minerador painel`, `minerador atalho`, `minerador agendar 9:00` e `minerador desagendar`.

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
src/painel/       coletor, agendamento e servidor do painel
painel/           a página do painel
supabase/         estrutura do banco (pra recriar em outro projeto)
packages/nucleo/  o núcleo que transforma as ferramentas em comandos e no servidor do Claude
tests/            testes automáticos (npm test)
```

</details>

---

<div align="center">

Feito por **Rafael Marutaka**

<sub>Não tem ligação com a Meta Platforms, Inc.</sub>

</div>
