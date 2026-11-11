# Minerador de Oferta

Ferramenta pessoal pra minerar ofertas na Biblioteca de Anúncios da Meta (Facebook, Instagram, Messenger, Threads e Audience Network). Ela lê o arquivo público da Biblioteca, sem login e sem tocar em conta de anúncio, e entrega os dados de cada anúncio: copy, criativos (com link do vídeo em HD), página de destino, botão de CTA, há quantos dias está no ar e quantas variações usam o mesmo criativo.

Funciona de dois jeitos, com as mesmas 9 ferramentas:

- **`minerador-cli`**: comandos pra rodar no terminal, em script ou em tarefa agendada do Windows. É o motor do coletor do painel.
- **`minerador-mcp`**: servidor MCP, pra plugar no Claude Desktop e pedir as buscas direto no chat.

País padrão: **Brasil** (`BR`). Troca por `FBADS_COUNTRY=MX` ou passando `--country` em cada comando.

## Instalação no Windows

Precisa do [Node.js 22 ou mais novo](https://nodejs.org) e do Git.

```powershell
git clone https://github.com/RafaelMarutaka/minerador-de-oferta.git
cd minerador-de-oferta
npm install
npm run build
npx playwright install chromium
npm link
```

O `npm link` deixa `minerador-cli` e `minerador-mcp` disponíveis em qualquer pasta. Pra conferir se está tudo certo:

```powershell
minerador-cli doctor
```

Ele abre um navegador invisível, faz uma busca de teste e diz se voltou anúncio.

## Comandos

```powershell
minerador-cli                                        # lista todos os comandos
minerador-cli search-ads --query "moldes" --limit 40  # anúncios ativos com a palavra, no Brasil
minerador-cli search-ads --query "plantillas" --country MX
minerador-cli list-advertisers --query "nome da página"   # acha o ID de uma página
minerador-cli search-ads --page-id 123456789          # todos os anúncios de uma página
minerador-cli get-ad --library-id 1234567890          # um anúncio completo
minerador-cli diff-advertiser --page-id 123456789     # o que a página ligou e desligou desde a última vez
minerador-cli ad-library-url --query "moldes"         # link da mesma busca pra abrir no navegador
minerador-cli <comando> --help                        # o que cada comando aceita
```

`--json` devolve JSON, `--select` filtra os campos (ex.: `--select ads.library_id,ads.days_active`) e `--agent` é JSON compacto sem perguntas, bom pra script.

### Códigos de saída

| Código | Significado |
|---|---|
| 0 | Deu certo (inclusive busca sem resultado) |
| 1 | Erro inesperado |
| 2 | Argumento faltando ou errado |
| 3 | Não encontrado |
| 4 | Chave de provedor recusada |
| 5 | Falha na Meta, no navegador ou no provedor |
| 7 | Sem crédito no provedor, ou limite de requisições |
| 10 | Modo escolhido não configurado (chave faltando ou Chromium não instalado) |

## As 9 ferramentas

| Ferramenta | Comando | O que faz |
|---|---|---|
| `search_ads` | `search-ads` | Busca por palavra-chave ou todos os anúncios de uma página |
| `list_advertisers` | `list-advertisers` | Acha o ID das páginas que anunciam com um termo |
| `get_ad` | `get-ad` | Um anúncio completo: todos os criativos e variações de copy |
| `view_ad_creative` | `view-ad-creative` | As imagens do anúncio |
| `diff_advertiser` | `diff-advertiser` | O que a página começou e parou de rodar desde a última olhada |
| `transcribe_ad` | `transcribe-ad` | Transcreve vídeo (só no modo `scrapecreators`) |
| `get_eu_transparency` | `get-eu-transparency` | Gasto e alcance (só anúncios na União Europeia ou políticos) |
| `ad_library_url` | `ad-library-url` | Gera o link da busca pra abrir no navegador |
| `backend_status` | `backend-status` | Mostra qual modo está ativo e se custa dinheiro (`doctor` testa a instalação toda) |

## Usar no Claude Desktop

No arquivo `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "minerador": {
      "command": "minerador-mcp"
    }
  }
}
```

Fecha o Claude Desktop por completo e abre de novo.

## O que dá pra saber, e o que não dá

- **Não existe dado de desempenho de concorrente.** Conversão, faturamento, CPA e ROAS de outro anunciante não são públicos em lugar nenhum. O sinal honesto é **tempo no ar** (`days_active`) e **quantas variações usam o mesmo criativo** (`variants_using_creative`). Anúncio rodando há meses provavelmente está dando lucro, mas isso é hipótese, não medição.
- **Gasto e alcance vêm vazios** pra anúncio comercial no Brasil e no México. Só existem pra anúncios veiculados na União Europeia e anúncios políticos. Vazio é a resposta certa, não erro.
- **A Meta limita quem busca demais.** O modo grátis usa um navegador de verdade. Se as buscas começarem a voltar vazias, espera uns minutos.
- **Os links de vídeo expiram.** Baixa o que quiser guardar na hora.
- Rode sem estar logado em nenhum perfil seu: a ferramenta não precisa de login.

## Configurações

Tudo opcional. Sem nada configurado, funciona no modo grátis pelo navegador.

| Variável | Padrão | O que faz |
|---|---|---|
| `FBADS_COUNTRY` | `BR` | País usado quando o comando não diz nenhum |
| `FBADS_BACKEND` | `browser` | `browser` (grátis, usa Chromium), `scrapecreators` ou `apify` (pagos, rápidos) |
| `SCRAPECREATORS_API_KEY` | | Chave do modo `scrapecreators` |
| `APIFY_TOKEN` | | Token do modo `apify` |
| `APIFY_ACTOR` | `lite` | `full` usa o robô maior da Apify |
| `META_ADS_ARCHIVE_TOKEN` | | Libera gasto e alcance da UE (token grátis da Meta) |
| `META_GRAPH_VERSION` | | Versão da API da Meta usada com o token acima |
| `FBADS_HEADED` | desligado | `1` mostra o navegador, pra ver por que uma busca voltou vazia |
| `FBADS_HYDRATE_MS` | `9000` | Quanto tempo esperar a página carregar |
| `FBADS_SCROLL_WAIT_MS` | `4000` | Pausa entre rolagens ao coletar |
| `FBADS_RETRIES` | `1` | Novas tentativas quando o navegador volta vazio |
| `FBADS_CACHE_DAYS` | `1` | Idade máxima do cache no modo `scrapecreators` (`0` sempre busca de novo) |
| `FBADS_STORE_DIR` | pasta de dados do app | Onde o `diff_advertiser` guarda as fotos de cada página |
| `FBADS_HTTP_PORT` | `8787` | Porta do modo `--http` |
| `FBADS_HTTP_HOST` | `127.0.0.1` | Interface do modo `--http` |
| `FBADS_HTTP_TOKEN` | | Token de acesso do modo `--http` |
| `FBADS_HTTP_ALLOWED_ORIGINS` | | Sites que podem se conectar no modo `--http` |
| `FBADS_SURFACE` | `full` | `search` mostra só 3 ferramentas que acham e rodam as outras |
| `FBADS_TOOL_TIMEOUT_MS` | | Desiste de uma ferramenta depois desse tempo |
| `FBADS_DEBUG` | `0` | `1` mostra mensagens de depuração |

## Nuvem (pra depois)

O `Dockerfile` já monta uma imagem com Chromium. Num servidor:

```bash
npm install && npm run build
docker build -t minerador .
docker run -p 8787:8787 -e FBADS_HTTP_TOKEN=um-token-seu minerador
```

Isso sobe o servidor MCP por HTTP. Pro coletor diário rodar na nuvem em vez do PC, é só agendar os comandos `minerador-cli` no servidor.

## Estrutura

```
src/                 o minerador (ferramentas, leitura da Biblioteca, modos)
packages/nucleo/     núcleo que gera o MCP e a CLI a partir das ferramentas
tests/               testes (npm test)
```

## Licença

MIT, de Rafael Marutaka. Componentes de código aberto usados no projeto têm os avisos de licença na pasta `licenses/`.

Não tem ligação com a Meta Platforms, Inc.
