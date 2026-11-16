-- Auto Engineer: Owner role (above Admin).
--   owner   : everything, including adding/changing/removing Admins and other Owners
--   admin   : everything except Owner and Admin accounts (can manage Managers and Sales)
--   manager : everything except settings and the staff list
--   sales   : orders, customers, sell requests
-- Run once in Supabase > SQL Editor. Safe to run again.

drop policy if exists "staff create" on public.docs;
drop policy if exists "staff update" on public.docs;
drop policy if exists "staff delete" on public.docs;

create policy "staff create" on public.docs for insert to authenticated
  with check (
       public.staff_role() = 'owner'
    or (public.staff_role() = 'admin'   and (col <> 'staff' or data->>'role' in ('manager','sales')))
    or (public.staff_role() = 'manager' and col not in ('config','staff'))
    or (public.staff_role() = 'sales'   and col in ('orders','customers','sellRequests'))
  );

create policy "staff update" on public.docs for update to authenticated
  -- which existing rows may be changed
  using (
       public.staff_role() = 'owner'
    or (public.staff_role() = 'admin' and (col <> 'staff' or data->>'role' in ('manager','sales')))
    or (public.staff_role() in ('manager','sales') and col <> 'staff')
  )
  -- what they may be changed into
  with check (
       public.staff_role() = 'owner'
    or (public.staff_role() = 'admin'   and (col <> 'staff' or data->>'role' in ('manager','sales')))
    or (public.staff_role() = 'manager' and col not in ('config','staff'))
    or (public.staff_role() = 'sales'   and col in ('orders','customers','sellRequests'))
  );

create policy "staff delete" on public.docs for delete to authenticated
  using (
       public.staff_role() = 'owner'
    or (public.staff_role() = 'admin'   and (col <> 'staff' or data->>'role' in ('manager','sales')))
    or (public.staff_role() = 'manager' and col not in ('config','staff'))
  );

-- the owner account (Mohammed). He creates his own password on the website.
insert into public.docs(col, id, data)
values ('staff', 'mhamadabdulmajed@gmail.com',
        jsonb_build_object('name', 'Mohammed', 'role', 'owner', 'branch', '', 'active', true,
                           'addedAt', (extract(epoch from now()) * 1000)::bigint))
on conflict (col, id) do update set data = docs.data || jsonb_build_object('role', 'owner', 'active', true);
