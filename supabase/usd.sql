-- =====================================================================
--  Auto Engineer — wholesale business in US dollars
--  Wholesale catalog prices, partner orders, partner invoices and the partner credit account are in USD.
--  Money owed to a shop for its sales on the (retail, IQD) website stays in IQD, kept apart (cur = 'IQD').
--  Run once in Supabase > SQL Editor. Safe to run again.
-- =====================================================================

-- partner price in dollars: discounts round to the cent
create or replace function public.ae_trade_price(p jsonb, disc numeric) returns numeric
language sql stable set search_path = public as $$
  with v as (select
      case when coalesce(p->>'wholesalePrice','') ~ '^[0-9.]+$' and (p->>'wholesalePrice')::numeric > 0 then (p->>'wholesalePrice')::numeric end as ws,
      case when coalesce(p->>'retailPrice','')    ~ '^[0-9.]+$' and (p->>'retailPrice')::numeric    > 0 then (p->>'retailPrice')::numeric    end as rp,
      case when coalesce(p->>'offerPrice','')     ~ '^[0-9.]+$' and (p->>'offerPrice')::numeric     > 0 then (p->>'offerPrice')::numeric     end as op,
      least(greatest(coalesce(disc,0),0),90) as d, public.ae_ws_default() as dd),
  b as (select op, case
      when ws is not null and d = 0 then ws
      when ws is not null then round(ws * (1 - d/100), 2)
      when rp is not null and (d > 0 or dd > 0) then ceil(rp * (1 - dd/100) * (1 - d/100) / 250) * 250
      else rp end as base from v)
  select case when base is null then op when op is null then base else least(base, op) end from b
$$;
revoke execute on function public.ae_trade_price(jsonb, numeric) from public, anon, authenticated;

-- credit account balance: dollars only (website-sale entries in IQD are separate)
create or replace function public.ae_balance(p_pid text) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum((data->>'amount')::numeric), 0) from docs
  where col = 'pledger' and data->>'pid' = p_pid and coalesce(data->>'cur','USD') <> 'IQD'
$$;
revoke execute on function public.ae_balance(text) from public, anon, authenticated;

-- invoice links: partner orders are dollar invoices
create or replace function public.public_invoice(p_key text) returns jsonb
language sql stable security definer set search_path = public as $$
  select x from (
    -- website orders (retail and wholesale customers)
    select jsonb_build_object(
      'src', 'order', 'no', d.data->>'no', 'invoiceNo', d.data->>'invoiceNo', 'invoicedAt', d.data->'invoicedAt',
      'status', d.data->>'status', 'lang', d.data->>'lang', 'pdfLang', d.data->>'pdfLang',
      'customer', jsonb_build_object('name', d.data#>>'{customer,name}', 'company', d.data#>>'{customer,company}',
                                     'phone', d.data#>>'{customer,phone}', 'location', d.data#>>'{customer,location}'),
      'fulfil', d.data->>'fulfil', 'branch', d.data->>'branch',
      'lines', coalesce((select jsonb_agg(jsonb_build_object('partNo', l->>'partNo', 'name', l->>'name', 'fit', l->>'fit',
                          'qty', l->'qty', 'price', l->'price', 'avail', l->>'avail')) from jsonb_array_elements(coalesce(d.data->'lines','[]'::jsonb)) l), '[]'::jsonb),
      'discount', d.data->'discount', 'discountType', d.data->>'discountType', 'delivery', d.data->'delivery', 'notes', d.data->>'notes',
      'payments', coalesce((select jsonb_agg(jsonb_build_object('amount', p->'amount')) from jsonb_array_elements(coalesce(d.data->'payments','[]'::jsonb)) p), '[]'::jsonb),
      'credits',  coalesce((select jsonb_agg(jsonb_build_object('amount', c->'amount')) from jsonb_array_elements(coalesce(d.data->'credits','[]'::jsonb)) c), '[]'::jsonb)) x
    from docs d where d.col = 'orders' and d.data->>'shareKey' = p_key and coalesce(d.data->>'invoiceNo','') <> ''
    union all
    -- partner shop purchase orders
    select jsonb_build_object(
      'src', 'porder', 'cur', 'USD', 'no', d.id, 'invoiceNo', d.data->>'invoiceNo', 'invoicedAt', d.data->'invoicedAt',
      'status', d.data->>'status', 'lang', coalesce(pt.data->>'lang','en'),
      'customer', jsonb_build_object('name', d.data->>'shop', 'phone', d.data->>'phone', 'location', d.data->>'city'),
      'fulfil', 'delivery',
      'lines', coalesce((select jsonb_agg(jsonb_build_object('partNo', l->>'partNo', 'name', l->>'name', 'qty', l->'qty', 'price', l->'price', 'avail', ''))
                         from jsonb_array_elements(coalesce(d.data->'lines','[]'::jsonb)) l), '[]'::jsonb),
      'discount', 0, 'delivery', coalesce(d.data->'deliveryFee','0'::jsonb),
      'notes', concat_ws(E'\n', case d.data->>'pay' when 'credit' then 'Payment: on credit' when 'online' then 'Payment: online' else 'Payment: cash on delivery' end, nullif(d.data->>'reply','')),
      'payments', '[]'::jsonb, 'credits', '[]'::jsonb) x
    from docs d left join docs pt on pt.col = 'partners' and pt.id = d.data->>'pid'
    where d.col = 'porders' and d.data->>'shareKey' = p_key and coalesce(d.data->>'invoiceNo','') <> ''
  ) z
  where length(coalesce(p_key,'')) >= 20
  limit 1
$$;
grant execute on function public.public_invoice(text) to anon, authenticated;

-- received parts go into the shop's stock with their dollar cost
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
        'nameAr', l->>'nameAr', 'nameKu', l->>'nameKu', 'qty', (l->>'qty')::int, 'cost', l->'price', 'costCur', 'USD', 'min', 0, 'reorder', 0,
        'createdAt', now_ms, 'updatedAt', now_ms, 'lastMove', now_ms));
    else
      update docs set data = data || jsonb_build_object('qty', coalesce((data->>'qty')::numeric,0) + (l->>'qty')::int,
          'cost', l->'price', 'costCur', 'USD', 'updatedAt', now_ms, 'lastMove', now_ms), updated_at = now()
      where col = 'pstock' and id = sid;
    end if;
    insert into docs(col,id,data) values ('pmoves', 'pm_' || replace(gen_random_uuid()::text,'-',''), jsonb_build_object(
      'pid', pid, 'stockId', sid, 'partNo', l->>'partNo', 'delta', (l->>'qty')::int, 'kind', 'purchase', 'note', p_no, 'at', now_ms));
  end loop;
  update docs set data = data || jsonb_build_object('status','received','updatedAt',now_ms,
           'log', coalesce(data->'log','[]'::jsonb) || jsonb_build_array(jsonb_build_object('at',now_ms,'s','received'))), updated_at = now()
  where col = 'porders' and id = p_no;
end $$;

select public.ae_trade_price('{"wholesalePrice":113.48}'::jsonb, 10) as check_price, 'wholesale in USD ready' as result;
