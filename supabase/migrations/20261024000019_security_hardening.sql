-- =============================================================================
-- BroTin Box · 0019 Security hardening (audit 24 Oct 2026)
--
--  * profiles.email / referred_by: customers could rewrite them through the
--    REST API. Staff roles were assigned by profile email, so a customer who
--    set their email to a future staff member's address could receive that
--    role. Only admins (or service_role) may change them now.
--  * staff_user_by_email(): role assignment looks the account up by its
--    CONFIRMED sign-in email in auth.users, never the editable profile copy.
--  * addresses.zone_id: customers could point an address at any zone (other
--    pincode, other fee). It must now be a zone for the address's own pincode;
--    otherwise it is re-derived from the pincode.
-- =============================================================================

create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then          -- service_role / SQL editor
    return new;
  end if;

  if new.role is distinct from old.role and not public.is_super_admin() then
    raise exception 'Only a super admin can change roles' using errcode = '42501';
  end if;

  if old.role = 'super_admin' and not public.is_super_admin() and auth.uid() <> old.id then
    raise exception 'Not allowed to modify a super admin' using errcode = '42501';
  end if;

  if not public.is_admin() and (
       new.is_blocked is distinct from old.is_blocked
    or new.referral_code is distinct from old.referral_code
    or new.phone_verified is distinct from old.phone_verified
    or new.kitchen_id is distinct from old.kitchen_id
    or new.email is distinct from old.email
    or new.referred_by is distinct from old.referred_by) then
    raise exception 'Not allowed to change privileged profile fields' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Super admin only: the account whose confirmed login email matches.
create or replace function public.staff_user_by_email(p_email text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return (select u.id from auth.users u
           where lower(u.email) = lower(trim(p_email))
             and u.email_confirmed_at is not null
           limit 1);
end;
$$;

grant execute on function public.staff_user_by_email(text) to authenticated;

-- Address zone must belong to the address's pincode.
create or replace function public.guard_address_zone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.has_permission('customers.write') then
    return new;
  end if;
  if new.zone_id is null or not exists (
       select 1 from public.delivery_zones z where z.id = new.zone_id and z.pincode = new.pincode) then
    new.zone_id := (select z.id from public.delivery_zones z
                     where z.pincode = new.pincode and z.is_active
                     order by z.id limit 1);
  end if;
  return new;
end;
$$;

create trigger addresses_guard_zone
  before insert or update of zone_id, pincode on public.addresses
  for each row execute function public.guard_address_zone();
