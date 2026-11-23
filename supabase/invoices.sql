-- =====================================================================
--  Auto Engineer — invoice links for customers
--  A customer opens autoengineeriq.com/#inv/<key> (sent on WhatsApp) to see and download
--  their invoice. The key is a long random code stored on the order; without it nothing is shown.
--  Run once in Supabase > SQL Editor. Safe to run again.
-- =====================================================================

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
      'src', 'porder', 'no', d.id, 'invoiceNo', d.data->>'invoiceNo', 'invoicedAt', d.data->'invoicedAt',
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
select 'invoice links ready' as result;
