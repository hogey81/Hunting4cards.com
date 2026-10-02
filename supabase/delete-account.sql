-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- Lets a logged-in user delete their own account and collection from the app
-- (required by Google Play and the App Store). Only works for yourself: auth.uid().
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.collections where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
