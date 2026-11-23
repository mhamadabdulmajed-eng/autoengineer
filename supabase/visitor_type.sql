-- Auto Engineer: what kind of customer a visitor is (chosen on their first visit).
-- ctype: 'retail' or 'wholesale'; seller = true when a retail customer has a few parts to sell.
-- Visitors can only call this function; they can never read the list. Run once in Supabase > SQL Editor.
create or replace function public.track_type(pk text, ctype text, seller boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if pk is null or pk !~ '^[0-9]{10,15}$' or ctype not in ('retail','wholesale') then return; end if;
  update docs set data = data || jsonb_build_object('ctype', ctype, 'seller', coalesce(seller,false) and ctype = 'retail')
  where col = 'visitors' and id = 'v_' || pk;
end $$;
grant execute on function public.track_type(text, text, boolean) to anon, authenticated;
select 'ok';
