-- A verified phone is a login: WhatsApp sign-in opens the account whose
-- phone matches and is verified. So any edit of `phone` by a signed-in user
-- (customer or staff) clears `phone_verified`; only the server (service role,
-- after a WhatsApp code check) can set a verified number.
--
-- Trigger name sorts after profiles_guard_privileged, so the guard still sees
-- phone_verified unchanged and doesn't reject the update.

create or replace function public.unverify_phone_on_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and new.phone is distinct from old.phone then
    new.phone_verified := false;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_phone_unverify on public.profiles;
create trigger profiles_phone_unverify
  before update of phone on public.profiles
  for each row execute function public.unverify_phone_on_change();
