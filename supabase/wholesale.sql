-- =====================================================================
--  Auto Engineer — wholesale prices for partner shops
--  Partner price = the part's wholesale price; if a part has none, retail minus the default
--  wholesale % (Staff › Settings). The partner's own extra discount and monthly reward come on top.
--  A partner-only offer price wins when it is lower. Retail visitors never see any of this.
--  The daily stock upload can also carry a Wholesale price column.
--  Run once in Supabase > SQL Editor. Safe to run again.
-- =====================================================================

-- default wholesale % (kept in a staff-only settings document, not in the public settings)
create or replace function public.ae_ws_default() returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((select least(greatest(nullif(data->>'wholesaleDiscount','')::numeric, 0), 90)
                   from docs where col = 'config' and id = 'pricing'), 0)
$$;

create or replace function public.ae_trade_price(p jsonb, disc numeric) returns numeric
language sql stable set search_path = public as $$
  with v as (select
      case when coalesce(p->>'wholesalePrice','') ~ '^[0-9.]+$' and (p->>'wholesalePrice')::numeric > 0 then (p->>'wholesalePrice')::numeric end as ws,
      case when coalesce(p->>'retailPrice','')    ~ '^[0-9.]+$' and (p->>'retailPrice')::numeric    > 0 then (p->>'retailPrice')::numeric    end as rp,
      case when coalesce(p->>'offerPrice','')     ~ '^[0-9.]+$' and (p->>'offerPrice')::numeric     > 0 then (p->>'offerPrice')::numeric     end as op,
      least(greatest(coalesce(disc,0),0),90) as d, public.ae_ws_default() as dd),
  b as (select op, case
      when ws is not null and d = 0 then ws
      when ws is not null then ceil(ws * (1 - d/100) / 250) * 250
      when rp is not null and (d > 0 or dd > 0) then ceil(rp * (1 - dd/100) * (1 - d/100) / 250) * 250
      else rp end as base from v)
  select case when base is null then op when op is null then base else least(base, op) end from b
$$;

-- only used inside the partner functions (they run with owner rights)
revoke execute on function public.ae_ws_default() from public, anon, authenticated;
revoke execute on function public.ae_trade_price(jsonb, numeric) from public, anon, authenticated;

-- daily stock upload: rows may carry a wholesale price (w)
create or replace function public.stock_apply(p_rows jsonb, p_zero_status text) returns int
language plpgsql security definer set search_path = public as $$
declare zs text := case when p_zero_status in ('Out of stock','On order','Ask') then p_zero_status else 'On order' end; n int;
begin
  if coalesce(public.staff_role(),'') not in ('owner','admin','manager') then raise exception 'not allowed'; end if;
  with r as (select x->>'k' as k, max(greatest(0, floor((x->>'q')::numeric)))::int as q,
                    max(case when coalesce(x->>'w','') ~ '^[0-9]+(\.[0-9]+)?$' and (x->>'w')::numeric > 0 then (x->>'w')::numeric end) as w
             from jsonb_array_elements(case when jsonb_typeof(p_rows) = 'array' then p_rows else '[]'::jsonb end) x
             where coalesce(x->>'q','') ~ '^-?[0-9]+(\.[0-9]+)?$' group by 1),
       u as (update docs d set data = d.data || jsonb_build_object('qty', r.q, 'stock', case when r.q > 0 then 'In stock' else zs end)
                                    || case when r.w is not null then jsonb_build_object('wholesalePrice', r.w) else '{}'::jsonb end,
                               updated_at = now()
             from r where d.col = 'parts' and d.pn = r.k
               and (d.data->'qty' is distinct from to_jsonb(r.q) or d.data->>'stock' is distinct from (case when r.q > 0 then 'In stock' else zs end)
                    or (r.w is not null and nullif(d.data->>'wholesalePrice','')::numeric is distinct from r.w))
             returning 1)
  select count(*) into n from u;
  return n;
end $$;

select public.ae_trade_price('{"retailPrice":100000}'::jsonb, 0) as check_price, 'wholesale prices ready' as result;
