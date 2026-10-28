-- =========================================================
-- GRUPO STAR — banco de dados no Supabase
-- Cole tudo no Supabase: SQL Editor › New query › Run.
-- O e-mail do dono (lá embaixo) precisa ser o mesmo cadastrado
-- em Authentication › Users.
-- Pode rodar de novo sem problema: o script não apaga dados.
-- =========================================================

-- Quem pode mexer no painel: só os e-mails desta lista.
create table if not exists public.donos (
  email text primary key
);
alter table public.donos enable row level security;  -- sem regras: ninguém lê pelo site

-- Confere se quem está logado é dono (roda com permissão própria para ler a lista acima).
create or replace function public.eh_dono()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.donos where email = lower(auth.jwt() ->> 'email'));
$$;

-- Configurações que o dono edita no painel (taxas, textos, avaliações, contato). Uma linha só.
create table if not exists public.config (
  id int primary key default 1 check (id = 1),
  dados jsonb not null,
  atualizado_em timestamptz not null default now()
);
alter table public.config enable row level security;

drop policy if exists "site le a configuracao" on public.config;
create policy "site le a configuracao" on public.config
  for select to anon, authenticated using (true);

drop policy if exists "dono altera a configuracao" on public.config;
create policy "dono altera a configuracao" on public.config
  for all to authenticated using (public.eh_dono()) with check (public.eh_dono());

-- Leads do site: o visitante só cria; ler e apagar é só para o dono.
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  nome text not null check (char_length(nome) between 1 and 80),
  telefone text not null check (telefone ~ '^[0-9]{10,11}$'),
  estado text not null check (estado ~ '^[A-Z]{2}$'),
  cidade text not null check (char_length(cidade) between 1 and 80),
  origem text not null default 'Site' check (char_length(origem) <= 40),
  resumo text not null default '' check (char_length(resumo) <= 1500)
);
alter table public.leads enable row level security;
create index if not exists leads_criado_em on public.leads (criado_em desc);

drop policy if exists "visitante cria lead" on public.leads;
create policy "visitante cria lead" on public.leads
  for insert to anon, authenticated with check (true);

drop policy if exists "dono le os leads" on public.leads;
create policy "dono le os leads" on public.leads
  for select to authenticated using (public.eh_dono());

drop policy if exists "dono apaga leads" on public.leads;
create policy "dono apaga leads" on public.leads
  for delete to authenticated using (public.eh_dono());

-- O visitante só preenche estes campos; id e data quem põe é o banco.
revoke insert on public.leads from anon, authenticated;
grant insert (nome, telefone, estado, cidade, origem, resumo) on public.leads to anon, authenticated;
grant select, delete on public.leads to authenticated;
grant select on public.config to anon, authenticated;
grant insert, update, delete on public.config to authenticated;

-- E-mail do dono: o mesmo cadastrado em Authentication › Users (troque aqui se mudar)
insert into public.donos (email) values (lower('goldstarconsultoriamtv@gmail.com'))
  on conflict do nothing;
