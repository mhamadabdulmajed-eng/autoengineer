-- =====================================================================
--  Auto Engineer — delete a partner account (staff owner/admin only)
--  Removes the shop, its sign-ins (owner + employees), stock, listings, shop page and alerts.
--  Refuses when the shop has purchase orders, credit-account entries or website sales,
--  so business records are never lost (pause those shops instead).
--  Run once in Supabase > SQL Editor. Safe to run again.
-- =====================================================================
create or replace function public.staff_delete_partner(p_pid text, p_force boolean default false) returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare em text[]; n_po int; n_lg int; n_sale int; n int;
begin
  if coalesce(public.staff_role(),'') not in ('owner','admin') then raise exception 'not allowed'; end if;
  if not exists(select 1 from docs where col = 'partners' and id = p_pid) then raise exception 'no partner'; end if;
  select count(*) into n_po from docs where col = 'porders' and data->>'pid' = p_pid and data->>'status' not in ('cancelled','rejected','merged');
  select count(*) into n_lg from docs where col = 'pledger' and data->>'pid' = p_pid;
  select count(*) into n_sale from docs d, jsonb_array_elements(coalesce(d.data->'lines','[]'::jsonb)) l
    where d.col = 'orders' and l->>'pid' = p_pid and d.data->>'status' not in ('cancelled','merged');
  if (n_po + n_lg + n_sale) > 0 and not p_force then
    return jsonb_build_object('ok', false, 'orders', n_po, 'ledger', n_lg, 'sales', n_sale);
  end if;
  select array_agg(lower(e)) into em from (
    select data->>'loginEmail' e from docs where col = 'partners' and id = p_pid
    union select data->>'loginEmail' from docs where col = 'pusers' and data->>'pid' = p_pid) x where e is not null;
  delete from auth.users where lower(email) = any(coalesce(em, '{}'));
  delete from docs where col in ('pstock','pmoves','plistings','psales','pnotify','pusers','pbrand','pshop') and (data->>'pid' = p_pid or id in ('pb_' || p_pid, 'sh_' || p_pid));
  get diagnostics n = row_count;
  delete from docs where col = 'partners' and id = p_pid;
  return jsonb_build_object('ok', true, 'removed', n + 1, 'logins', coalesce(array_length(em, 1), 0));
end $$;
revoke execute on function public.staff_delete_partner(text, boolean) from public, anon;
grant execute on function public.staff_delete_partner(text, boolean) to authenticated;
select 'delete partner ready' as result;
