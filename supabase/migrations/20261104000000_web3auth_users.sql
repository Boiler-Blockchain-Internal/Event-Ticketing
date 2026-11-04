-- Sign-in moved to MetaMask Embedded Wallets, so users no longer mirror auth.users.
-- Every attendee read goes through an edge function with the service key, so the auth.uid() policies are dead.
alter table users drop constraint users_id_fkey;
alter table users alter column id set default gen_random_uuid();
alter table users alter column wallet_address set not null;

drop policy "read own profile" on users;
drop policy "read own credentials" on credentials;
drop policy "read own checkins" on checkins;
