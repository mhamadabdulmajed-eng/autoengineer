-- =====================================================================
--  Auto Engineer — Partner portal, step 2
--  Selling on the website (listings), counter sales, credit accounts, back-in-stock alerts,
--  partner-only offers, monthly volume rewards, search trends, shop staff accounts.
--  Requires supabase/partners.sql. Run once in Supabase > SQL Editor. Safe to run again.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- who is signed in: the shop owner OR one of the shop's employees ----------
create or replace function public.my_partner() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select d.id from docs d where d.col = 'partners' and d.data->>'loginEmail' = lower(auth.jwt()->>'email')
       and coalesce(d.data->>'status','active') = 'active' limit 1),
    (select u.data->>'pid' from docs u join docs p on p.col = 'partners' and p.id = u.data->>'pid'
       where u.col = 'pusers' and u.data->>'loginEmail' = lower(auth.jwt()->>'email')
         and coalesce(u.data->>'active','true') = 'true' and coalesce(p.data->>'status','active') = 'active' limit 1))
$$;

create or replace function public.my_partner_role() returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists(select 1 from docs where col = 'partners' and data->>'loginEmail' = lower(auth.jwt()->>'email')) then 'owner'
    else (select coalesce(data->>'role','seller') from docs where col = 'pusers' and data->>'loginEmail' = lower(auth.jwt()->>'email') limit 1) end
$$;

create or replace function public.my_partner_doc() returns jsonb
language sql stable security definer set search_path = public as $$
  select (d.data - 'notes') || jsonb_build_object('id', d.id, 'role', public.my_partner_role(),
           'userName', (select data->>'name' from docs where col = 'pusers' and data->>'loginEmail' = lower(auth.jwt()->>'email') limit 1))
  from docs d where d.col = 'partners' and d.id = public.my_partner()
$$;

-- ---------- access rules ----------
drop policy if exists "partner read own"     on public.docs;
drop policy if exists "partner create stock" on public.docs;
drop policy if exists "partner update stock" on public.docs;
drop policy if exists "partner delete stock" on public.docs;
drop policy if exists "public read listings" on public.docs;

create policy "partner read own" on public.docs for select to authenticated
  using (col in ('pstock','pmoves','porders','plistings','psales','pledger','pnotify','pusers') and data->>'pid' = public.my_partner());

-- stock, movements, counter sales and alerts: the shop writes its own; listings only by the owner, always waiting for approval
create policy "partner create stock" on public.docs for insert to authenticated
  with check (data->>'pid' = public.my_partner() and (
    col in ('pstock','pmoves','psales','pnotify')
    or (col = 'plistings' and public.my_partner_role() = 'owner' and data->>'status' = 'pending')));

create policy "partner update stock" on public.docs for update to authenticated
  using (data->>'pid' = public.my_partner() and (col in ('pstock','psales') or (col = 'plistings' and public.my_partner_role() = 'owner')))
  with check (data->>'pid' = public.my_partner() and (col in ('pstock','psales')
    or (col = 'plistings' and public.my_partner_role() = 'owner' and data->>'status' in ('pending','paused'))));

create policy "partner delete stock" on public.docs for delete to authenticated
  using (data->>'pid' = public.my_partner() and (col in ('pstock','pnotify') or (col = 'plistings' and public.my_partner_role() = 'owner')));

-- approved listings are public (shown in the Retail room)
create policy "public read listings" on public.docs for select to anon, authenticated
  using (col = 'plistings' and data->>'status' = 'approved');

-- ---------- volume rewards: extra % next month when last month's purchases reach a tier ----------
create or replace function public.ae_month_total(p_pid text, months_ago int) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum((data->>'total')::numeric), 0) from docs
  where col = 'porders' and data->>'pid' = p_pid and data->>'status' in ('approved','paid','shipped','delivered','received')
    and to_timestamp((data->>'createdAt')::bigint / 1000) >= date_trunc('month', now()) - make_interval(months => months_ago)
    and to_timestamp((data->>'createdAt')::bigint / 1000) <  date_trunc('month', now()) - make_interval(months => months_ago - 1)
$$;

create or replace function public.ae_reward_pct(amount numeric) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(max((t->>'pct')::numeric), 0)
  from docs s, jsonb_array_elements(coalesce(s.data->'rewardTiers','[]'::jsonb)) t
  where s.col = 'config' and s.id = 'settings' and amount >= (t->>'min')::numeric
$$;

create or replace function public.ae_partner_disc(p_pid text) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((select (data->>'discount')::numeric from docs where col = 'partners' and id = p_pid), 0)
       + public.ae_reward_pct(public.ae_month_total(p_pid, 1))
$$;

-- partner price: wholesale price, or retail minus discount (+ reward); a partner-only offer price wins if lower
create or replace function public.ae_trade_price(p jsonb, disc numeric) returns numeric
language sql immutable as $$
  select nullif(least(
    case
      when coalesce(p->>'wholesalePrice','') ~ '^[0-9.]+$' and (p->>'wholesalePrice')::numeric > 0 then (p->>'wholesalePrice')::numeric
      when coalesce(p->>'retailPrice','') ~ '^[0-9.]+$' and (p->>'retailPrice')::numeric > 0
        then ceil((p->>'retailPrice')::numeric * (1 - least(greatest(coalesce(disc,0),0),90) / 100) / 250) * 250
      else 1e15 end,
    case when coalesce(p->>'offerPrice','') ~ '^[0-9.]+$' and (p->>'offerPrice')::numeric > 0 then (p->>'offerPrice')::numeric else 1e15 end), 1e15)
$$;

create or replace function public.partner_prices(ids text[]) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare pid text := public.my_partner(); disc numeric;
begin
  if pid is null then return '{}'::jsonb; end if;
  disc := public.ae_partner_disc(pid);
  return coalesce((select jsonb_object_agg(d.id, public.ae_trade_price(d.data, disc))
                   from docs d where d.col = 'parts' and d.id = any(ids[1:200])
                     and coalesce((d.data->>'hidden')::boolean, false) = false), '{}'::jsonb);
end $$;

create or replace function public.partner_reward_status() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare pid text := public.my_partner();
begin
  if pid is null then return null; end if;
  return jsonb_build_object('thisMonth', public.ae_month_total(pid, 0), 'lastMonth', public.ae_month_total(pid, 1),
    'activePct', public.ae_reward_pct(public.ae_month_total(pid, 1)),
    'tiers', coalesce((select data->'rewardTiers' from docs where col = 'config' and id = 'settings'), '[]'::jsonb));
end $$;

-- ---------- partner-only offers ----------
create or replace function public.partner_offers() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare pid text := public.my_partner(); disc numeric;
begin
  if pid is null then return '[]'::jsonb; end if;
  disc := public.ae_partner_disc(pid);
  return coalesce((select jsonb_agg(x) from (
    select jsonb_build_object('id', id, 'partNo', data->>'partNo', 'name', data->>'name', 'nameAr', data->>'nameAr', 'nameKu', data->>'nameKu',
      'stock', data->>'stock', 'price', public.ae_trade_price(data, disc), 'offerNote', data->>'offerNote') x
    from docs where col = 'parts' and coalesce((data->>'hidden')::boolean,false) = false
      and coalesce(data->>'offerPrice','') ~ '^[0-9.]+$' and (data->>'offerPrice')::numeric > 0
    order by data->>'partNo' limit 500) z), '[]'::jsonb);
end $$;

-- ---------- what customers search for (last 30 days, all of Iraq) ----------
create or replace function public.partner_trends() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare since bigint := ((extract(epoch from now()) - 30*86400) * 1000)::bigint;
begin
  if public.my_partner() is null and public.staff_role() is null then return null; end if;
  return jsonb_build_object(
    'top', coalesce((select jsonb_agg(z) from (
        select jsonb_build_object('q', min(s->>'q'), 'n', count(*), 'found', max(coalesce((s->>'n')::int,0)) > 0) z
        from docs v, jsonb_array_elements(coalesce(v.data->'searches','[]'::jsonb)) s
        where v.col = 'visitors' and coalesce(s->>'k','search') in ('search','find') and coalesce((s->>'at')::bigint,0) >= since and length(s->>'q') >= 3
        group by lower(trim(s->>'q')) order by count(*) desc limit 30) y), '[]'::jsonb),
    'missing', coalesce((select jsonb_agg(z) from (
        select jsonb_build_object('q', min(s->>'q'), 'n', count(*)) z
        from docs v, jsonb_array_elements(coalesce(v.data->'searches','[]'::jsonb)) s
        where v.col = 'visitors' and coalesce(s->>'k','search') = 'search' and coalesce((s->>'n')::int,0) = 0
          and coalesce((s->>'at')::bigint,0) >= since and length(s->>'q') >= 3
        group by lower(trim(s->>'q')) order by count(*) desc limit 20) y), '[]'::jsonb));
end $$;

-- ---------- back-in-stock alerts: which of my alerts are now in stock ----------
create or replace function public.partner_notify_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'partId', n.data->>'partId', 'stock', p.data->>'stock')), '[]'::jsonb)
  from docs n left join docs p on p.col = 'parts' and p.id = n.data->>'partId'
  where n.col = 'pnotify' and n.data->>'pid' = public.my_partner()
$$;

-- ---------- my sales on the website (customer details stay with Auto Engineer) ----------
create or replace function public.partner_sales() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by (x->>'at')::bigint desc), '[]'::jsonb) from (
    select jsonb_build_object('order', o.data->>'no', 'at', o.data->'createdAt', 'status', o.data->>'status', 'partNo', l->>'partNo',
      'name', l->>'name', 'qty', l->'qty', 'price', l->'price', 'listingId', l->>'listingId', 'paidOut', coalesce(l->'paidOut','false'::jsonb)) x
    from docs o, jsonb_array_elements(coalesce(o.data->'lines','[]'::jsonb)) l
    where o.col = 'orders' and l->>'pid' = public.my_partner() limit 500) z
$$;

-- ---------- current balance on the credit account ----------
create or replace function public.ae_balance(p_pid text) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum((data->>'amount')::numeric), 0) from docs where col = 'pledger' and data->>'pid' = p_pid
$$;

-- ---------- place an order (payment: cash on delivery, online, or on credit within the limit) ----------
create or replace function public.partner_place_order(p_lines jsonb, p_pay text, p_note text) returns text
language plpgsql security definer set search_path = public as $$
declare pid text := public.my_partner(); pt jsonb; disc numeric; y int := extract(year from now()); c jsonb; n int; no text;
        lines jsonb := '[]'::jsonb; l jsonb; p jsonb; q int; pr numeric; tot numeric := 0; now_ms bigint := (extract(epoch from now())*1000)::bigint;
begin
  if pid is null then raise exception 'not a partner'; end if;
  if public.my_partner_role() not in ('owner','buyer') then raise exception 'not allowed'; end if;
  select data into pt from docs where col = 'partners' and id = pid;
  disc := public.ae_partner_disc(pid);
  for l in select * from jsonb_array_elements(case when jsonb_typeof(p_lines) = 'array' then p_lines else '[]'::jsonb end) limit 300 loop
    q := case when coalesce(l->>'qty','') ~ '^[0-9]{1,5}$' then (l->>'qty')::int else 0 end;
    if q <= 0 then continue; end if;
    select data into p from docs where col = 'parts' and id = l->>'partId' and coalesce((data->>'hidden')::boolean,false) = false;
    if p is null then continue; end if;
    pr := public.ae_trade_price(p, disc);
    lines := lines || jsonb_build_array(jsonb_build_object('partId', l->>'partId', 'partNo', p->>'partNo', 'name', p->>'name',
               'nameAr', p->>'nameAr', 'nameKu', p->>'nameKu', 'qty', q, 'price', pr));
    tot := tot + coalesce(pr,0) * q;
  end loop;
  if jsonb_array_length(lines) = 0 then raise exception 'empty order'; end if;
  if p_pay = 'credit' then
    if coalesce((pt->>'creditLimit')::numeric, 0) <= 0 then raise exception 'no credit'; end if;
    if public.ae_balance(pid) + tot > (pt->>'creditLimit')::numeric then raise exception 'credit limit'; end if;
  end if;
  insert into docs(col,id,data) values ('config','pocounter', jsonb_build_object('year', y)) on conflict do nothing;
  select data into c from docs where col = 'config' and id = 'pocounter' for update;
  if (c->>'year')::int is distinct from y then c := jsonb_build_object('year', y); end if;
  n := coalesce((c->>'n')::int, 0) + 1;
  update docs set data = c || jsonb_build_object('n', n), updated_at = now() where col = 'config' and id = 'pocounter';
  no := 'PO-' || y || '-' || lpad(n::text, 4, '0');
  insert into docs(col,id,data) values ('porders', no, jsonb_build_object(
    'pid', pid, 'shop', pt->>'shop', 'phone', pt->>'phone', 'city', pt->>'city',
    'lines', lines, 'total', tot, 'pay', case when p_pay in ('cod','online','credit') then p_pay else 'cod' end,
    'note', left(coalesce(p_note,''), 500), 'status', 'new', 'createdAt', now_ms, 'updatedAt', now_ms,
    'log', jsonb_build_array(jsonb_build_object('at', now_ms, 's', 'new'))));
  return no;
end $$;

-- ---------- sign-ins (shared by Auto Engineer staff and partner owners) ----------
create or replace function public.ae_set_login(p_email text, p_password text, p_meta jsonb) returns void
language plpgsql security definer set search_path = public, extensions, auth as $$
declare uid uuid;
begin
  if length(coalesce(p_password,'')) < 8 then raise exception 'password too short'; end if;
  select id into uid from auth.users where lower(email) = lower(p_email);
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                           raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                           confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', lower(p_email),
            extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}'::jsonb, coalesce(p_meta,'{}'::jsonb), now(), now(), '', '', '', '');
    insert into auth.identities(id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', lower(p_email), 'email_verified', true), 'email', now(), now(), now());
  else
    update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now() where id = uid;
  end if;
end $$;
revoke execute on function public.ae_set_login(text,text,jsonb) from public, anon, authenticated;

create or replace function public.staff_set_partner_login(p_pid text, p_password text) returns text
language plpgsql security definer set search_path = public as $$
declare em text;
begin
  if coalesce(public.staff_role(),'') not in ('owner','admin') then raise exception 'not allowed'; end if;
  select lower(data->>'loginEmail') into em from docs where col = 'partners' and id = p_pid;
  if coalesce(em,'') = '' then raise exception 'no partner'; end if;
  perform public.ae_set_login(em, p_password, jsonb_build_object('partner', p_pid));
  return em;
end $$;

-- shop owner adds or updates an employee (role: seller = counter sales and stock; buyer = also orders from Auto Engineer)
create or replace function public.partner_set_user(p_phone text, p_name text, p_role text, p_password text, p_active boolean) returns text
language plpgsql security definer set search_path = public as $$
declare pid text := public.my_partner(); pk text; em text; uid text; ex jsonb;
begin
  if pid is null or public.my_partner_role() <> 'owner' then raise exception 'not allowed'; end if;
  pk := regexp_replace(coalesce(p_phone,''), '\D', '', 'g');
  if pk !~ '^[0-9]{10,15}$' then raise exception 'phone'; end if;
  em := pk || '@partner.autoengineeriq.com';
  uid := 'pu_' || pk;
  -- never take over someone else's sign-in
  if exists(select 1 from docs where col = 'partners' and lower(data->>'loginEmail') = em) then raise exception 'phone in use'; end if;
  select data into ex from docs where col = 'pusers' and id = uid;
  if ex is not null and ex->>'pid' <> pid then raise exception 'phone in use'; end if;
  if ex is null and exists(select 1 from auth.users where lower(email) = em) then raise exception 'phone in use'; end if;
  insert into docs(col,id,data) values ('pusers', uid, jsonb_build_object('pid', pid, 'phone', p_phone, 'name', left(coalesce(p_name,''),60),
      'role', case when p_role in ('seller','buyer') then p_role else 'seller' end, 'loginEmail', em, 'active', coalesce(p_active,true),
      'createdAt', (extract(epoch from now())*1000)::bigint))
    on conflict (col,id) do update set data = docs.data || jsonb_build_object('name', left(coalesce(p_name,''),60),
      'role', case when p_role in ('seller','buyer') then p_role else 'seller' end, 'active', coalesce(p_active,true)), updated_at = now();
  if coalesce(p_password,'') <> '' then perform public.ae_set_login(em, p_password, jsonb_build_object('partner', pid, 'employee', true)); end if;
  return em;
end $$;

grant execute on function public.my_partner(), public.my_partner_role(), public.my_partner_doc(), public.partner_prices(text[]),
  public.partner_reward_status(), public.partner_offers(), public.partner_trends(), public.partner_notify_status(), public.partner_sales(),
  public.partner_place_order(jsonb,text,text), public.staff_set_partner_login(text,text),
  public.partner_set_user(text,text,text,text,boolean) to authenticated;
revoke execute on function public.staff_set_partner_login(text,text), public.partner_set_user(text,text,text,text,boolean) from anon;
-- internal helpers: only used inside the functions above
revoke execute on function public.ae_month_total(text,int), public.ae_reward_pct(numeric), public.ae_partner_disc(text), public.ae_balance(text) from public, anon, authenticated;
select 'partners step 2 ready' as result;
