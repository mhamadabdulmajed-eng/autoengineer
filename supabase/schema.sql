-- =====================================================================
--  Auto Engineer — database setup for Supabase
--  Paste this whole file into Supabase → SQL Editor → New query → Run.
--  Then run the two lines at the very bottom (owner + Telegram) with
--  your own details.
-- =====================================================================

-- 1. One table holds everything (parts, orders, customers, …) -----------
create table if not exists public.docs (
  col        text not null,
  id         text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (col, id)
);
alter table public.docs enable row level security;

-- secrets the website can never read (Telegram bot token etc.)
create table if not exists public.app_secrets (key text primary key, value text not null);
alter table public.app_secrets enable row level security;   -- no policies = no API access

-- live updates for the staff area
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;

-- 2. Who is staff, and with which role ------------------------------------
create or replace function public.staff_role() returns text
language sql stable security definer set search_path = public as $$
  select d.data->>'role' from docs d
  where d.col = 'staff' and d.id = lower(auth.jwt()->>'email')
    and coalesce((d.data->>'active')::boolean, true)
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select public.staff_role() is not null
$$;

create or replace function public.my_staff() returns jsonb
language sql stable security definer set search_path = public as $$
  select d.data || jsonb_build_object('email', d.id) from docs d
  where d.col = 'staff' and d.id = lower(auth.jwt()->>'email')
    and coalesce((d.data->>'active')::boolean, true)
$$;

-- 3. Access rules -----------------------------------------------------------
drop policy if exists "staff read all"        on public.docs;
drop policy if exists "public read settings"  on public.docs;
drop policy if exists "public create"         on public.docs;
drop policy if exists "staff create"          on public.docs;
drop policy if exists "staff update"          on public.docs;
drop policy if exists "staff delete"          on public.docs;

-- staff see everything
create policy "staff read all" on public.docs for select to authenticated
  using (public.is_staff());

-- everyone can read the business settings (name, phone, branches, logo)
create policy "public read settings" on public.docs for select to anon, authenticated
  using (col = 'config' and id = 'settings');

-- visitors can only CREATE new orders, sell requests and trade applications
create policy "public create" on public.docs for insert to anon, authenticated
  with check (
       (col = 'orders'       and data->>'status' = 'new')
    or (col = 'sellRequests' and data->>'status' = 'new')
    or (col = 'wholesalers'  and data->>'status' = 'pending' and not (data ? 'pin'))
  );

-- staff writes, limited by role
--   admin   : everything
--   manager : everything except settings and staff list
--   sales   : orders, customers, sell requests
create policy "staff create" on public.docs for insert to authenticated
  with check (
       public.staff_role() = 'admin'
    or (public.staff_role() = 'manager' and col not in ('config','staff'))
    or (public.staff_role() = 'sales'   and col in ('orders','customers','sellRequests'))
  );
create policy "staff update" on public.docs for update to authenticated
  using (public.is_staff())
  with check (
       public.staff_role() = 'admin'
    or (public.staff_role() = 'manager' and col not in ('config','staff'))
    or (public.staff_role() = 'sales'   and col in ('orders','customers','sellRequests'))
  );
create policy "staff delete" on public.docs for delete to authenticated
  using (public.staff_role() in ('admin','manager') and col not in ('config','staff')
         or public.staff_role() = 'admin');

-- 4. Public catalog WITHOUT wholesale prices --------------------------------
create or replace view public.public_parts as
  select col, id, (data - 'wholesalePrice') as data
  from public.docs
  where col = 'parts' and coalesce((data->>'hidden')::boolean, false) = false;
grant select on public.public_parts to anon, authenticated;

-- 5. Helpers the website calls ---------------------------------------------
-- track an order with order number + phone
create or replace function public.track_order(p_no text, p_phone text) returns jsonb
language sql stable security definer set search_path = public as $$
  select d.data - 'log' from docs d
  where d.col = 'orders' and d.id = upper(trim(p_no))
    and d.data->'customer'->>'phoneKey' = p_phone
$$;

-- customer accepts a quotation
create or replace function public.accept_quote(p_no text, p_phone text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update docs set
    data = jsonb_set(data, '{status}', '"accepted"')
           || jsonb_build_object('updatedAt', (extract(epoch from now())*1000)::bigint,
                                 'log', coalesce(data->'log','[]'::jsonb)
                                        || jsonb_build_array(jsonb_build_object('at',(extract(epoch from now())*1000)::bigint,'s','accepted'))),
    updated_at = now()
  where col = 'orders' and id = upper(trim(p_no))
    and data->'customer'->>'phoneKey' = p_phone and data->>'status' = 'quoted';
end $$;

-- wholesaler sign-in with phone + PIN → profile and trade prices
create or replace function public.ws_login(p_phone text, p_pin text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare w jsonb;
begin
  select data into w from docs where col = 'wholesalers' and id = 'w_' || p_phone;
  if w is null then return jsonb_build_object('error','notfound'); end if;
  if w->>'status' <> 'approved' then return jsonb_build_object('error', w->>'status'); end if;
  if coalesce(w->>'pin','') <> p_pin then return jsonb_build_object('error','pin'); end if;
  return jsonb_build_object(
    'profile', w - 'pin',
    'prices', coalesce((select jsonb_object_agg(id, (data->>'wholesalePrice')::numeric)
                        from docs where col = 'parts' and coalesce(data->>'wholesalePrice','') ~ '^[0-9.]+$'), '{}'::jsonb));
end $$;

-- running numbers for quotations, invoices, credit notes (per year)
create or replace function public.next_no(p_kind text) returns int
language plpgsql security definer set search_path = public as $$
declare y int := extract(year from now()); c jsonb; n int;
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  if p_kind not in ('quote','invoice','credit') then raise exception 'bad kind'; end if;
  insert into docs(col,id,data) values ('config','counters', jsonb_build_object('year', y)) on conflict do nothing;
  select data into c from docs where col = 'config' and id = 'counters' for update;
  if (c->>'year')::int is distinct from y then c := jsonb_build_object('year', y); end if;
  n := coalesce((c->>p_kind)::int, 0) + 1;
  update docs set data = c || jsonb_build_object(p_kind, n), updated_at = now() where col = 'config' and id = 'counters';
  return n;
end $$;

grant execute on function public.track_order(text,text), public.accept_quote(text,text), public.ws_login(text,text) to anon, authenticated;
grant execute on function public.next_no(text), public.my_staff() to authenticated;

-- 6. When an order arrives: save the customer profile + send a Telegram alert
create extension if not exists pg_net;

create or replace function public.on_new_doc() returns trigger
language plpgsql security definer set search_path = public as $$
declare k text; c jsonb; tok text; chat text; msg text; n int;
begin
  if new.col = 'orders' then
    k := new.data->'customer'->>'phoneKey';
    select data into c from docs where col = 'customers' and id = 'c_' || k;
    insert into docs(col,id,data) values ('customers', 'c_' || k,
      coalesce(c,'{}'::jsonb) || jsonb_build_object(
        'name', new.data->'customer'->>'name', 'phone', new.data->'customer'->>'phone', 'phoneKey', k,
        'location', new.data->'customer'->>'location',
        'type', case when new.data->>'room' = 'wholesale' then 'wholesale' else coalesce(c->>'type','retail') end,
        'lang', coalesce(new.data->>'lang','en'),
        'firstAt', coalesce(c->'firstAt', to_jsonb((extract(epoch from now())*1000)::bigint)),
        'lastAt', (extract(epoch from now())*1000)::bigint))
    on conflict (col,id) do update set data = excluded.data, updated_at = now();
  end if;

  select value into tok  from app_secrets where key = 'telegram_token';
  select value into chat from app_secrets where key = 'telegram_chat_id';
  if tok is not null and chat is not null then
    if new.col = 'orders' then
      n := jsonb_array_length(coalesce(new.data->'lines','[]'::jsonb));
      msg := '🛒 New ' || coalesce(new.data->>'room','retail') || ' order ' || new.id || E'\n'
          || (new.data->'customer'->>'name') || ' · ' || (new.data->'customer'->>'phone') || ' · ' || (new.data->'customer'->>'location')
          || E'\n' || n || ' item(s)' || case when coalesce(new.data->>'comment','') <> '' then E'\n💬 ' || (new.data->>'comment') else '' end;
    elsif new.col = 'sellRequests' then
      msg := '📦 Sell request: ' || (new.data->>'partName') || E'\n' || (new.data->>'name') || ' · ' || (new.data->>'phone');
    elsif new.col = 'wholesalers' then
      msg := '🏪 Wholesale application: ' || (new.data->>'company') || E'\n' || (new.data->>'name') || ' · ' || (new.data->>'phone');
    end if;
    if msg is not null then
      perform net.http_post(
        url := 'https://api.telegram.org/bot' || tok || '/sendMessage',
        body := jsonb_build_object('chat_id', chat, 'text', msg),
        headers := '{"Content-Type":"application/json"}'::jsonb);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists docs_on_insert on public.docs;
create trigger docs_on_insert after insert on public.docs
  for each row when (new.col in ('orders','sellRequests','wholesalers'))
  execute function public.on_new_doc();

-- =====================================================================
--  RUN THESE WITH YOUR OWN DETAILS (remove the -- at the start first)
-- =====================================================================
-- Make yourself the first admin (use the email you will sign in with):
-- insert into docs(col,id,data) values ('staff','you@example.com','{"name":"Mohammed","role":"admin","active":true}');

-- Optional Telegram alerts for new orders (token from @BotFather, chat id from @userinfobot):
-- insert into app_secrets values ('telegram_token','123456:ABC...'), ('telegram_chat_id','123456789');
