-- The server key (service_role) was refused on every table in the private
-- schemas (otp.phone_otps, crm.*) on the live database, although 0022/0025/0028
-- grant it. Re-apply the grants, and make future crm tables/functions get them
-- automatically. Customers and visitors (anon, authenticated) stay locked out.

grant usage on schema otp, crm to service_role;
grant select, insert, update, delete on all tables in schema otp to service_role;
grant select, insert, update, delete on all tables in schema crm to service_role;
grant usage, select on all sequences in schema otp, crm to service_role;
grant execute on all functions in schema otp, crm to service_role;

alter default privileges in schema crm grant select, insert, update, delete on tables to service_role;
alter default privileges in schema crm grant execute on functions to service_role;
alter default privileges in schema otp grant select, insert, update, delete on tables to service_role;

notify pgrst, 'reload schema';
