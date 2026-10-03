-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- Daily price history for Pro (charts, price alerts). Every morning the website saves
-- today's price of each card that is in a collection, and each collection's total value.
-- At the end this shows a secret code: put it in Vercel as CRON_SECRET.

-- The secret the daily job must send. The "private" schema can't be reached through the app.
create schema if not exists private;
create table if not exists private.cron_token (token text not null);
insert into private.cron_token (token)
select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
where not exists (select 1 from private.cron_token);

-- One price per card, version and day. Prices are public, so anyone may read them.
create table if not exists public.price_history (
  card_ref text not null,
  variant text not null check (variant in ('normal', 'reverse')),
  day date not null,
  trend numeric(10, 2),
  low numeric(10, 2),
  avg30 numeric(10, 2),
  primary key (card_ref, variant, day)
);
alter table public.price_history enable row level security;
drop policy if exists "prices are public" on public.price_history;
create policy "prices are public" on public.price_history for select using (true);

-- Total value of each collection per day. Everyone only sees their own.
create table if not exists public.collection_value_history (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  value numeric(12, 2) not null,
  cards int not null,
  primary key (user_id, day)
);
alter table public.collection_value_history enable row level security;
drop policy if exists "own value history" on public.collection_value_history;
create policy "own value history" on public.collection_value_history
  for select using (auth.uid() = user_id);

create or replace function private.check_cron_token(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_token is null or not exists (select 1 from private.cron_token where token = p_token) then
    raise exception 'geen toegang' using errcode = '42501';
  end if;
end;
$$;

-- All cards that are in at least one collection (no names or accounts, only card codes).
create or replace function public.price_history_refs(p_token text)
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_cron_token(p_token);
  return query
    select distinct e->>'cardId'
    from public.collections c,
         jsonb_array_elements(case when jsonb_typeof(c.entries) = 'array' then c.entries else '[]'::jsonb end) e
    where e->>'cardId' is not null;
end;
$$;

-- Saves today's prices: [{card_ref, variant, trend, low, avg30}, ...]
create or replace function public.record_prices(p_token text, p_rows jsonb)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  perform private.check_cron_token(p_token);
  insert into public.price_history (card_ref, variant, day, trend, low, avg30)
  select r.card_ref, r.variant, (now() at time zone 'utc')::date, r.trend, r.low, r.avg30
  from jsonb_to_recordset(p_rows) as r(card_ref text, variant text, trend numeric, low numeric, avg30 numeric)
  where r.variant in ('normal', 'reverse')
  on conflict (card_ref, variant, day) do update
    set trend = excluded.trend, low = excluded.low, avg30 = excluded.avg30;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Today's value of every collection, from today's prices (a holo print has the normal price).
create or replace function public.record_collection_values(p_token text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'utc')::date;
  n int;
begin
  perform private.check_cron_token(p_token);
  insert into public.collection_value_history (user_id, day, value, cards)
  select c.user_id, today,
         coalesce(sum(p.trend * coalesce((e->>'quantity')::int, 1)), 0),
         coalesce(sum(coalesce((e->>'quantity')::int, 1)), 0)
  from public.collections c
  cross join lateral jsonb_array_elements(case when jsonb_typeof(c.entries) = 'array' then c.entries else '[]'::jsonb end) e
  left join public.price_history p
    on p.card_ref = e->>'cardId'
   and p.variant = case when e->>'variant' = 'reverse' then 'reverse' else 'normal' end
   and p.day = today
  group by c.user_id
  on conflict (user_id, day) do update set value = excluded.value, cards = excluded.cards;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function private.check_cron_token(text) from public, anon, authenticated;
revoke execute on function public.price_history_refs(text) from public;
revoke execute on function public.record_prices(text, jsonb) from public;
revoke execute on function public.record_collection_values(text) from public;
grant execute on function public.price_history_refs(text) to anon, authenticated;
grant execute on function public.record_prices(text, jsonb) to anon, authenticated;
grant execute on function public.record_collection_values(text) to anon, authenticated;

-- The secret code: copy it into Vercel as CRON_SECRET.
select token as "CRON_SECRET" from private.cron_token;
