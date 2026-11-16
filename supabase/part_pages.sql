-- Auto Engineer: data for the public part pages (autoengineeriq.com/part/<part number>) and the sitemap.
-- Only visible parts, never wholesale prices. Run once in Supabase > SQL Editor. Safe to run again.

create or replace function public.part_page(p_no text) returns jsonb
language sql stable security definer set search_path = public as $$
  select (d.data - 'wholesalePrice' - 'desc') || jsonb_build_object('id', d.id)
  from docs d
  where d.col = 'parts' and d.pn = public.ae_pn(p_no)
    and coalesce((d.data->>'hidden')::boolean, false) = false
  order by length(d.data->>'partNo')
  limit 1
$$;

-- all visible part numbers, one per line (for sitemap.xml)
create or replace function public.part_numbers() returns text
language sql stable security definer set search_path = public as $$
  select string_agg(data->>'partNo', E'\n' order by data->>'partNo')
  from docs where col = 'parts' and coalesce((data->>'hidden')::boolean, false) = false
$$;

-- other parts with the same name (for "related parts" links on a part page)
create or replace function public.related_parts(p_no text, nm text, lim int default 8) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('partNo', x.data->>'partNo', 'name', x.data->>'name',
           'nameAr', x.data->>'nameAr', 'retailPrice', x.data->'retailPrice')), '[]'::jsonb)
  from (select data from docs
        where col = 'parts' and coalesce((data->>'hidden')::boolean, false) = false
          and data->>'name' = nm and docs.pn <> public.ae_pn(p_no)
        order by data->>'partNo' limit least(coalesce(lim, 8), 20)) x
$$;

grant execute on function public.part_page(text) to anon, authenticated;
grant execute on function public.part_numbers() to anon, authenticated;
grant execute on function public.related_parts(text, text, int) to anon, authenticated;
