-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- The numbers on the /beheer page. Only accounts listed in public.admins may read them.

create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade
);
-- No policies: nobody can read or change this table through the app.
alter table public.admins enable row level security;

create or replace function public.admin_stats()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  today timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  month timestamptz := date_trunc('month', now() at time zone 'utc') at time zone 'utc';
  mails_today int;
  mails_month int;
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'geen toegang' using errcode = '42501';
  end if;

  -- Login mails sent. Supabase doesn't keep a log of them in the database, so this counts
  -- the people who asked for a code or logged in: about one mail each.
  select count(*) filter (where greatest(confirmation_sent_at, recovery_sent_at, last_sign_in_at) >= today),
         count(*) filter (where greatest(confirmation_sent_at, recovery_sent_at, last_sign_in_at) >= month)
    into mails_today, mails_month
    from auth.users;

  return json_build_object(
    'users', (select count(*) from auth.users),
    'new_today', (select count(*) from auth.users where created_at >= today),
    'new_30d', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
    'active_today', (select count(*) from auth.users where last_sign_in_at >= today),
    'active_30d', (select count(*) from auth.users where last_sign_in_at >= now() - interval '30 days'),
    'collections', (select count(*) from public.collections),
    'cards', (select coalesce(sum(jsonb_array_length(entries)), 0) from public.collections where jsonb_typeof(entries) = 'array'),
    'db_bytes', pg_database_size(current_database()),
    'mails_today', mails_today,
    'mails_month', mails_month,
    'at', now()
  );
end;
$$;

revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- Make yourself admin: replace the email address with the one you log in to the app with.
insert into public.admins (user_id)
select id from auth.users where email = 'JOUW-EMAILADRES'
on conflict do nothing;
