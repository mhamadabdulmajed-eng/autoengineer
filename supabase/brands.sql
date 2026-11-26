-- =====================================================================
--  Auto Engineer — partner shop pages ("My shop page")
--  pbrand : the shop's own draft (logo, name, about, details). Only that shop's OWNER edits it;
--           every save goes back to 'pending' for Auto Engineer to approve.
--  pshop  : the published page, written by Auto Engineer staff on approval. Public.
--  Partner price lists use the existing plistings (every item still needs approval).
--  Requires partners2.sql. Run once in Supabase > SQL Editor. Safe to run again.
-- =====================================================================

drop policy if exists "partner brand read"   on public.docs;
drop policy if exists "partner brand create" on public.docs;
drop policy if exists "partner brand update" on public.docs;
drop policy if exists "public read shops"    on public.docs;

create policy "partner brand read" on public.docs for select to authenticated
  using (col = 'pbrand' and data->>'pid' = public.my_partner());

create policy "partner brand create" on public.docs for insert to authenticated
  with check (col = 'pbrand' and id = 'pb_' || public.my_partner() and data->>'pid' = public.my_partner()
              and public.my_partner_role() = 'owner' and data->>'status' in ('draft','pending'));

create policy "partner brand update" on public.docs for update to authenticated
  using (col = 'pbrand' and data->>'pid' = public.my_partner() and public.my_partner_role() = 'owner')
  with check (col = 'pbrand' and id = 'pb_' || public.my_partner() and data->>'pid' = public.my_partner()
              and data->>'status' in ('draft','pending'));

-- published shop pages are public (unless hidden)
create policy "public read shops" on public.docs for select to anon, authenticated
  using (col = 'pshop' and coalesce(data->>'hidden','false') <> 'true');

select 'shop pages ready' as result;
