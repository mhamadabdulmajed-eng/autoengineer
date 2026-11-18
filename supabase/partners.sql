-- =====================================================================
--  Auto Engineer — Partner portal (trusted shops), step 1
--  * Partner accounts are created ONLY by the Owner/Admin (no public sign-up).
--    A partner signs in with phone number + password.
--  * Each partner sees ONLY their own stock, stock movements and orders.
--  * Partners buy from Auto Engineer at their own trade price; every order
--    waits for Auto Engineer's approval.
--  Run once in Supabase > SQL Editor. Safe to run again.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- who is the signed-in partner (partner id), or null
create or replace function public.my_partner() returns text
language sql stable security definer set search_path = public as $$
  select d.id from docs d
  where d.col = 'partners' and d.data->>'loginEmail' = lower(auth.jwt()->>'email')
    and coalesce(d.data->>'status','active') = 'active'
  limit 1
$$;

-- the signed-in partner's own profile (without anything private to Auto Engineer)
create or replace function public.my_partner_doc() returns jsonb
language sql stable security definer set search_path = public as $$
  select (d.data - 'notes') || jsonb_build_object('id', d.id) from docs d
  where d.col = 'partners' and d.data->>'loginEmail' = lower(auth.jwt()->>'email')
    and coalesce(d.data->>'status','active') = 'active'
  limit 1
$$;

-- ---------- access rules for partner data ----------
drop policy if exists "partner read own"     on public.docs;
drop policy if exists "partner create stock" on public.docs;
drop policy if exists "partner update stock" on public.docs;
drop policy if exists "partner delete stock" on public.docs;

create policy "partner read own" on public.docs for select to authenticated
  using (col in ('pstock','pmoves','porders') and data->>'pid' = public.my_partner());

create policy "partner create stock" on public.docs for insert to authenticated
  with check (col in ('pstock','pmoves') and data->>'pid' = public.my_partner());

create policy "partner update stock" on public.docs for update to authenticated
  using (col = 'pstock' and data->>'pid' = public.my_partner())
  with check (col = 'pstock' and data->>'pid' = public.my_partner());

create policy "partner delete stock" on public.docs for delete to authenticated
  using (col = 'pstock' and data->>'pid' = public.my_partner());

-- ---------- trade price for a partner ----------
-- wholesale price if the part has one, otherwise retail price minus the partner's discount,
-- rounded up to 250 IQD
create or replace function public.ae_trade_price(p jsonb, disc numeric) returns numeric
language sql immutable as $$
  select case
    when coalesce(p->>'wholesalePrice','') ~ '^[0-9.]+$' and (p->>'wholesalePrice')::numeric > 0 then (p->>'wholesalePrice')::numeric
    when coalesce(p->>'retailPrice','') ~ '^[0-9.]+$' and (p->>'retailPrice')::numeric > 0
      then ceil((p->>'retailPrice')::numeric * (1 - least(greatest(coalesce(disc,0),0),90) / 100) / 250) * 250
    else null end
$$;

create or replace function public.partner_prices(ids text[]) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare pt jsonb;
begin
  select data into pt from docs where col = 'partners' and id = public.my_partner();
  if pt is null then return '{}'::jsonb; end if;
  return coalesce((select jsonb_object_agg(d.id, public.ae_trade_price(d.data, (pt->>'discount')::numeric))
                   from docs d where d.col = 'parts' and d.id = any(ids[1:200])
                     and coalesce((d.data->>'hidden')::boolean, false) = false), '{}'::jsonb);
end $$;

-- ---------- partner places a purchase order (prices are always recalculated here) ----------
create or replace function public.partner_place_order(p_lines jsonb, p_pay text, p_note text) returns text
language plpgsql security definer set search_path = public as $$
declare pid text := public.my_partner(); pt jsonb; y int := extract(year from now()); c jsonb; n int; no text;
        lines jsonb := '[]'::jsonb; l jsonb; p jsonb; q int; pr numeric; tot numeric := 0; now_ms bigint := (extract(epoch from now())*1000)::bigint;
begin
  if pid is null then raise exception 'not a partner'; end if;
  select data into pt from docs where col = 'partners' and id = pid;
  for l in select * from jsonb_array_elements(case when jsonb_typeof(p_lines) = 'array' then p_lines else '[]'::jsonb end) limit 300 loop
    q := case when coalesce(l->>'qty','') ~ '^[0-9]{1,5}$' then (l->>'qty')::int else 0 end;
    if q <= 0 then continue; end if;
    select data into p from docs where col = 'parts' and id = l->>'partId' and coalesce((data->>'hidden')::boolean,false) = false;
    if p is null then continue; end if;
    pr := public.ae_trade_price(p, (pt->>'discount')::numeric);
    lines := lines || jsonb_build_array(jsonb_build_object('partId', l->>'partId', 'partNo', p->>'partNo', 'name', p->>'name',
               'nameAr', p->>'nameAr', 'nameKu', p->>'nameKu', 'qty', q, 'price', pr));
    tot := tot + coalesce(pr,0) * q;
  end loop;
  if jsonb_array_length(lines) = 0 then raise exception 'empty order'; end if;
  -- running number PO-2026-0001
  insert into docs(col,id,data) values ('config','pocounter', jsonb_build_object('year', y)) on conflict do nothing;
  select data into c from docs where col = 'config' and id = 'pocounter' for update;
  if (c->>'year')::int is distinct from y then c := jsonb_build_object('year', y); end if;
  n := coalesce((c->>'n')::int, 0) + 1;
  update docs set data = c || jsonb_build_object('n', n), updated_at = now() where col = 'config' and id = 'pocounter';
  no := 'PO-' || y || '-' || lpad(n::text, 4, '0');
  insert into docs(col,id,data) values ('porders', no, jsonb_build_object(
    'pid', pid, 'shop', pt->>'shop', 'phone', pt->>'phone', 'city', pt->>'city',
    'lines', lines, 'total', tot, 'pay', case when p_pay in ('cod','online') then p_pay else 'cod' end,
    'note', left(coalesce(p_note,''), 500), 'status', 'new', 'createdAt', now_ms, 'updatedAt', now_ms,
    'log', jsonb_build_array(jsonb_build_object('at', now_ms, 's', 'new'))));
  return no;
end $$;

-- partner cancels an order that has not been approved yet
create or replace function public.partner_cancel_order(p_no text) returns void
language plpgsql security definer set search_path = public as $$
declare now_ms bigint := (extract(epoch from now())*1000)::bigint;
begin
  update docs set data = data || jsonb_build_object('status','cancelled','updatedAt',now_ms,
           'log', coalesce(data->'log','[]'::jsonb) || jsonb_build_array(jsonb_build_object('at',now_ms,'s','cancelled'))), updated_at = now()
  where col = 'porders' and id = p_no and data->>'pid' = public.my_partner() and data->>'status' = 'new';
end $$;

-- partner confirms the parts arrived: order becomes "received" and the parts are added to their stock
create or replace function public.partner_receive_order(p_no text) returns void
language plpgsql security definer set search_path = public as $$
declare pid text := public.my_partner(); o jsonb; l jsonb; sid text; cur jsonb; now_ms bigint := (extract(epoch from now())*1000)::bigint;
begin
  if pid is null then raise exception 'not a partner'; end if;
  select data into o from docs where col = 'porders' and id = p_no and data->>'pid' = pid for update;
  if o is null or o->>'status' not in ('shipped','delivered') then raise exception 'not ready'; end if;
  for l in select * from jsonb_array_elements(o->'lines') loop
    sid := 'ps_' || pid || '_' || upper(regexp_replace(coalesce(l->>'partNo',''), '[^A-Za-z0-9]', '', 'g'));
    select data into cur from docs where col = 'pstock' and id = sid;
    if cur is null then
      insert into docs(col,id,data) values ('pstock', sid, jsonb_build_object('pid', pid, 'partNo', l->>'partNo', 'name', l->>'name',
        'nameAr', l->>'nameAr', 'nameKu', l->>'nameKu', 'qty', (l->>'qty')::int, 'cost', l->'price', 'min', 0, 'reorder', 0,
        'createdAt', now_ms, 'updatedAt', now_ms, 'lastMove', now_ms));
    else
      update docs set data = data || jsonb_build_object('qty', coalesce((data->>'qty')::numeric,0) + (l->>'qty')::int,
          'cost', l->'price', 'updatedAt', now_ms, 'lastMove', now_ms), updated_at = now()
      where col = 'pstock' and id = sid;
    end if;
    insert into docs(col,id,data) values ('pmoves', 'pm_' || replace(gen_random_uuid()::text,'-',''), jsonb_build_object(
      'pid', pid, 'stockId', sid, 'partNo', l->>'partNo', 'delta', (l->>'qty')::int, 'kind', 'purchase', 'note', p_no, 'at', now_ms));
  end loop;
  update docs set data = data || jsonb_build_object('status','received','updatedAt',now_ms,
           'log', coalesce(data->'log','[]'::jsonb) || jsonb_build_array(jsonb_build_object('at',now_ms,'s','received'))), updated_at = now()
  where col = 'porders' and id = p_no;
end $$;

-- ---------- Owner/Admin: create or reset a partner's sign-in ----------
create or replace function public.staff_set_partner_login(p_pid text, p_password text) returns text
language plpgsql security definer set search_path = public, extensions, auth as $$
declare pt jsonb; em text; uid uuid;
begin
  if coalesce(public.staff_role(),'') not in ('owner','admin') then raise exception 'not allowed'; end if;
  if length(coalesce(p_password,'')) < 8 then raise exception 'password too short'; end if;
  select data into pt from public.docs where col = 'partners' and id = p_pid;
  if pt is null then raise exception 'no partner'; end if;
  em := lower(coalesce(pt->>'loginEmail', ''));
  if em = '' then raise exception 'no login'; end if;
  select id into uid from auth.users where lower(email) = em;
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                           raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                           confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', em,
            extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('partner', p_pid), now(), now(), '', '', '', '');
    insert into auth.identities(id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true), 'email', now(), now(), now());
  else
    update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now() where id = uid;
  end if;
  return em;
end $$;

grant execute on function public.my_partner(), public.my_partner_doc(), public.partner_prices(text[]),
  public.partner_place_order(jsonb,text,text), public.partner_cancel_order(text), public.partner_receive_order(text),
  public.staff_set_partner_login(text,text) to authenticated;
revoke execute on function public.staff_set_partner_login(text,text) from anon;
