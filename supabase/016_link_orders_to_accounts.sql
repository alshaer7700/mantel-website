-- Associate signed-in orders with auth.users without trusting client-supplied
-- user IDs. Guest orders remain null and continue to work.

create or replace function public.assign_order_user_id()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

revoke all on function public.assign_order_user_id() from public, anon, authenticated;

drop trigger if exists orders_assign_user_id on public.orders;
create trigger orders_assign_user_id
before insert on public.orders
for each row execute function public.assign_order_user_id();

create index if not exists orders_user_created_idx
  on public.orders (user_id, created_at desc);
