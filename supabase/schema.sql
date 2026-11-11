-- Estrutura do banco do Minerador de Oferta (Supabase / Postgres).
-- Já aplicada no projeto minerador-de-oferta (Personal Projects). Serve pra recriar o banco em
-- outro projeto: cole no SQL Editor do Supabase e rode.

create table public.buscas (
  id bigint generated always as identity primary key,
  termo text not null check (length(trim(termo)) > 0),
  pais text not null default 'BR' check (pais ~ '^[A-Z]{2}$'),
  nicho text,
  ativa boolean not null default true,
  criada_em timestamptz not null default now(),
  unique (termo, pais)
);

create table public.paginas (
  page_id text primary key,
  nome text,
  url text,
  foto_url text,
  curtidas integer,
  primeira_vez timestamptz not null default now(),
  ultima_vez timestamptz not null default now()
);

create table public.anuncios (
  library_id text primary key,
  page_id text references public.paginas(page_id) on delete set null,
  pais text,
  formato text,
  botao text,
  destino text,
  link_url text,
  dominio text,
  titulo text,
  copy text,
  dias_no_ar integer,
  copias integer,
  inicio date,
  ativo boolean,
  video_url text,
  imagem_url text,
  plataformas text[],
  link_biblioteca text,
  salvo boolean not null default false,
  nota text,
  arquivo_video text,
  primeira_vez timestamptz not null default now(),
  ultima_vez timestamptz not null default now()
);
create index anuncios_page_idx on public.anuncios (page_id);
create index anuncios_salvo_idx on public.anuncios (salvo) where salvo;

create table public.aparicoes (
  dia date not null,
  busca_id bigint not null references public.buscas(id) on delete cascade,
  library_id text not null references public.anuncios(library_id) on delete cascade,
  page_id text,
  primary key (dia, busca_id, library_id)
);
create index aparicoes_pagina_dia_idx on public.aparicoes (page_id, dia);
create index aparicoes_anuncio_idx on public.aparicoes (library_id);

create table public.coletas (
  id bigint generated always as identity primary key,
  busca_id bigint references public.buscas(id) on delete cascade,
  dia date not null,
  encontrados integer,
  total_meta integer,
  aviso text,
  erro text,
  iniciada_em timestamptz not null default now(),
  terminada_em timestamptz
);
create index coletas_dia_idx on public.coletas (dia desc);

-- Banco fechado: só a chave secreta (usada no seu PC) lê e escreve.
alter table public.buscas enable row level security;
alter table public.paginas enable row level security;
alter table public.anuncios enable row level security;
alter table public.aparicoes enable row level security;
alter table public.coletas enable row level security;

create view public.ofertas with (security_invoker = true) as
with ultimo as (
  select max(dia) as d from public.aparicoes
),
pagina_hoje as (
  select ap.page_id, count(distinct ap.library_id)::int as n
  from public.aparicoes ap, ultimo
  where ap.dia = ultimo.d
  group by ap.page_id
),
achados as (
  select ap.library_id,
         array_agg(distinct b.termo order by b.termo) as termos,
         array_agg(distinct b.pais order by b.pais) as paises,
         array_agg(distinct b.nicho order by b.nicho) filter (where b.nicho is not null) as nichos,
         max(ap.dia) as visto_em
  from public.aparicoes ap
  join public.buscas b on b.id = ap.busca_id
  group by ap.library_id
)
select a.library_id, a.page_id, p.nome as pagina, p.foto_url, p.url as pagina_url,
       a.pais, a.formato, a.botao, a.destino, a.link_url, a.dominio, a.titulo, a.copy,
       a.dias_no_ar, a.copias, a.inicio, a.video_url, a.imagem_url, a.plataformas,
       a.link_biblioteca, a.salvo, a.nota, a.arquivo_video, a.primeira_vez, a.ultima_vez,
       coalesce(ph.n, 0) as anuncios_da_pagina,
       ac.termos, ac.paises, ac.nichos, ac.visto_em,
       (ac.visto_em = (select d from ultimo)) as no_ar_agora,
       round((least(coalesce(a.copias, 1), 20) * 3
            + least(coalesce(a.dias_no_ar, 0), 180) / 6.0
            + least(coalesce(ph.n, 0), 30) * 2)::numeric, 1) as forca
from public.anuncios a
left join public.paginas p on p.page_id = a.page_id
left join pagina_hoje ph on ph.page_id = a.page_id
left join achados ac on ac.library_id = a.library_id;

create view public.paginas_por_dia with (security_invoker = true) as
select page_id, dia, count(distinct library_id)::int as anuncios
from public.aparicoes
where page_id is not null
group by page_id, dia;

create or replace function public.paginas_crescendo(janela integer default 7)
returns table (
  page_id text, nome text, foto_url text, url text,
  anuncios_agora integer, anuncios_antes integer, crescimento integer,
  ultimo_dia date, primeira_vez timestamptz, mais_antigo_dias integer
)
language sql stable security invoker set search_path = ''
as $$
  with por_dia as (
    select ppd.page_id, ppd.dia, ppd.anuncios from public.paginas_por_dia ppd
  ),
  ultimo as (
    select distinct on (pd.page_id) pd.page_id, pd.dia, pd.anuncios
    from por_dia pd order by pd.page_id, pd.dia desc
  ),
  base as (
    select distinct on (pd.page_id) pd.page_id, pd.anuncios
    from por_dia pd join ultimo u on u.page_id = pd.page_id
    where pd.dia >= u.dia - janela and pd.dia < u.dia
    order by pd.page_id, pd.dia asc
  )
  select u.page_id, p.nome, p.foto_url, p.url,
         u.anuncios, coalesce(b.anuncios, u.anuncios), u.anuncios - coalesce(b.anuncios, u.anuncios),
         u.dia, p.primeira_vez,
         (select max(a.dias_no_ar) from public.anuncios a where a.page_id = u.page_id)
  from ultimo u
  left join base b on b.page_id = u.page_id
  left join public.paginas p on p.page_id = u.page_id;
$$;

revoke all on function public.paginas_crescendo(integer) from public, anon, authenticated;
revoke all on public.ofertas, public.paginas_por_dia from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Filtro low ticket e páginas ignoradas (segunda versão)
-- ---------------------------------------------------------------------------

alter table public.anuncios
  add column low_ticket boolean,
  add column pontos_lt integer,
  add column sinais text[];
create index anuncios_low_ticket_idx on public.anuncios (low_ticket);

create table public.paginas_ignoradas (
  page_id text primary key,
  nome text,
  criada_em timestamptz not null default now()
);
alter table public.paginas_ignoradas enable row level security;

drop view public.ofertas;
create view public.ofertas with (security_invoker = true) as
with ultimo as (
  select max(dia) as d from public.aparicoes
),
pagina_hoje as (
  select ap.page_id, count(distinct ap.library_id)::int as n
  from public.aparicoes ap, ultimo
  where ap.dia = ultimo.d
  group by ap.page_id
),
achados as (
  select ap.library_id,
         array_agg(distinct b.termo order by b.termo) as termos,
         array_agg(distinct b.pais order by b.pais) as paises,
         array_agg(distinct b.nicho order by b.nicho) filter (where b.nicho is not null) as nichos,
         max(ap.dia) as visto_em
  from public.aparicoes ap
  join public.buscas b on b.id = ap.busca_id
  group by ap.library_id
)
select a.library_id, a.page_id, p.nome as pagina, p.foto_url, p.url as pagina_url,
       a.pais, a.formato, a.botao, a.destino, a.link_url, a.dominio, a.titulo, a.copy,
       a.dias_no_ar, a.copias, a.inicio, a.video_url, a.imagem_url, a.plataformas,
       a.link_biblioteca, a.salvo, a.nota, a.arquivo_video, a.primeira_vez, a.ultima_vez,
       a.low_ticket, a.pontos_lt, a.sinais,
       (pi.page_id is not null) as ignorada,
       coalesce(ph.n, 0) as anuncios_da_pagina,
       ac.termos, ac.paises, ac.nichos, ac.visto_em,
       (ac.visto_em = (select d from ultimo)) as no_ar_agora,
       round((least(coalesce(a.copias, 1), 20) * 3
            + least(coalesce(a.dias_no_ar, 0), 180) / 6.0
            + least(coalesce(ph.n, 0), 30) * 2)::numeric, 1) as forca
from public.anuncios a
left join public.paginas p on p.page_id = a.page_id
left join public.paginas_ignoradas pi on pi.page_id = a.page_id
left join pagina_hoje ph on ph.page_id = a.page_id
left join achados ac on ac.library_id = a.library_id;
revoke all on public.ofertas from anon, authenticated;

drop function public.paginas_crescendo(integer);
create function public.paginas_crescendo(janela integer default 7, so_low_ticket boolean default true)
returns table (
  page_id text, nome text, foto_url text, url text,
  anuncios_agora integer, anuncios_antes integer, crescimento integer,
  ultimo_dia date, primeira_vez timestamptz, mais_antigo_dias integer
)
language sql stable security invoker set search_path = ''
as $$
  with por_dia as (
    select ap.page_id, ap.dia, count(distinct ap.library_id)::int as anuncios
    from public.aparicoes ap
    join public.anuncios a on a.library_id = ap.library_id
    where ap.page_id is not null
      and (not so_low_ticket or a.low_ticket)
      and not exists (select 1 from public.paginas_ignoradas pi where pi.page_id = ap.page_id)
    group by ap.page_id, ap.dia
  ),
  ultimo as (
    select distinct on (pd.page_id) pd.page_id, pd.dia, pd.anuncios
    from por_dia pd order by pd.page_id, pd.dia desc
  ),
  base as (
    select distinct on (pd.page_id) pd.page_id, pd.anuncios
    from por_dia pd join ultimo u on u.page_id = pd.page_id
    where pd.dia >= u.dia - janela and pd.dia < u.dia
    order by pd.page_id, pd.dia asc
  )
  select u.page_id, p.nome, p.foto_url, p.url,
         u.anuncios, coalesce(b.anuncios, u.anuncios), u.anuncios - coalesce(b.anuncios, u.anuncios),
         u.dia, p.primeira_vez,
         (select max(a.dias_no_ar) from public.anuncios a where a.page_id = u.page_id)
  from ultimo u
  left join base b on b.page_id = u.page_id
  left join public.paginas p on p.page_id = u.page_id;
$$;
revoke all on function public.paginas_crescendo(integer, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Idade de cada oferta e radar de novidades (terceira versão)
-- ---------------------------------------------------------------------------

drop view public.ofertas;
create view public.ofertas with (security_invoker = true) as
with ultimo as (
  select max(dia) as d from public.aparicoes
),
pagina_hoje as (
  select ap.page_id, count(distinct ap.library_id)::int as n
  from public.aparicoes ap, ultimo
  where ap.dia = ultimo.d
  group by ap.page_id
),
achados as (
  select ap.library_id,
         array_agg(distinct b.termo order by b.termo) as termos,
         array_agg(distinct b.pais order by b.pais) as paises,
         array_agg(distinct b.nicho order by b.nicho) filter (where b.nicho is not null) as nichos,
         max(ap.dia) as visto_em
  from public.aparicoes ap
  join public.buscas b on b.id = ap.busca_id
  group by ap.library_id
)
select a.library_id, a.page_id, p.nome as pagina, p.foto_url, p.url as pagina_url,
       a.pais, a.formato, a.botao, a.destino, a.link_url, a.dominio, a.titulo, a.copy,
       a.dias_no_ar, a.copias, a.inicio, a.video_url, a.imagem_url, a.plataformas,
       a.link_biblioteca, a.salvo, a.nota, a.arquivo_video, a.primeira_vez, a.ultima_vez,
       a.low_ticket, a.pontos_lt, a.sinais,
       (pi.page_id is not null) as ignorada,
       coalesce(ph.n, 0) as anuncios_da_pagina,
       ac.termos, ac.paises, ac.nichos, ac.visto_em,
       (ac.visto_em = (select d from ultimo)) as no_ar_agora,
       coalesce(a.inicio, ac.visto_em - coalesce(a.dias_no_ar, 0)) as comecou_em,
       greatest(current_date - coalesce(a.inicio, ac.visto_em - coalesce(a.dias_no_ar, 0)), 0) as idade_dias,
       round((least(coalesce(a.copias, 1), 20) * 3
            + least(coalesce(a.dias_no_ar, 0), 180) / 6.0
            + least(coalesce(ph.n, 0), 30) * 2)::numeric, 1) as forca
from public.anuncios a
left join public.paginas p on p.page_id = a.page_id
left join public.paginas_ignoradas pi on pi.page_id = a.page_id
left join pagina_hoje ph on ph.page_id = a.page_id
left join achados ac on ac.library_id = a.library_id;
revoke all on public.ofertas from anon, authenticated;

create or replace function public.radar_novidades(dias integer default 14, so_low_ticket boolean default true)
returns table (dia date, ofertas integer)
language sql stable security invoker set search_path = ''
as $$
  with serie as (
    select (current_date - g)::date as dia from generate_series(0, greatest(dias, 1) - 1) g
  ),
  contagem as (
    select o.comecou_em as dia, count(*)::int as n
    from public.ofertas o
    where o.no_ar_agora and not o.ignorada and (not so_low_ticket or o.low_ticket)
      and o.comecou_em >= current_date - greatest(dias, 1) + 1
    group by o.comecou_em
  )
  select s.dia, coalesce(c.n, 0) from serie s left join contagem c on c.dia = s.dia order by s.dia;
$$;
revoke all on function public.radar_novidades(integer, boolean) from public, anon, authenticated;
