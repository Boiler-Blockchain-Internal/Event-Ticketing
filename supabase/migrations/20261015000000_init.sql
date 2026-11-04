-- Off-chain state: users, wallet mapping, events, credential mirror, check-ins, nonces.
-- Personal data lives here only; the contract holds credential ID, holder address, event ID, status, metadata hash.

create table orgs (
  id   uuid primary key default gen_random_uuid(),
  name text not null
);

create table users (
  id             uuid primary key references auth.users on delete cascade,
  email          text not null unique,
  name           text,
  wallet_address text unique check (wallet_address ~ '^0x[0-9a-f]{40}$') -- lowercase
);

create table events (
  id             text primary key check (id ~ '^[A-Za-z0-9_-]+$'), -- appears in QR payloads
  org_id         uuid not null references orgs,
  kind           text not null default 'event' check (kind in ('event', 'membership')),
  name           text not null,
  starts_at      timestamptz,
  doors_open_at  timestamptz,
  doors_close_at timestamptz,
  venue          text,
  capacity       int check (capacity > 0)
);
create index on events (org_id);

-- Mirror of the on-chain credential, keyed by token ID.
-- ponytail: owner check reads this mirror; read ownerOf from the contract once it is deployed.
create table credentials (
  id            numeric(78) primary key, -- uint256 token ID
  event_id      text not null references events,
  holder_id     uuid not null references users,
  status        text not null default 'active' check (status in ('active', 'revoked')),
  reissued_as   numeric(78) references credentials,
  metadata_hash text
);
create index on credentials (holder_id);
create index on credentials (event_id);
create index on credentials (reissued_as);

create table checkins (
  event_id      text not null references events,
  credential_id numeric(78) not null references credentials,
  checked_in_at timestamptz not null default now(),
  primary key (event_id, credential_id) -- two scanners racing cannot both admit
);
create index on checkins (credential_id);

-- ponytail: rows older than the 60s QR window are dead weight; add a pg_cron delete when the table grows.
create table nonces (
  nonce      text primary key,
  created_at timestamptz not null default now()
);

-- One round trip per scan. Signature and timestamp are checked by the caller before this runs.
-- Returns 'admit', 'repeat' (with the first check-in time) or 'replay' (nonce already used).
create function check_in(p_event text, p_credential numeric, p_nonce text)
returns table (result text, checked_in_at timestamptz)
language plpgsql
set search_path = public
as $$
begin
  return query select 'repeat'::text, c.checked_in_at from checkins c
    where c.event_id = p_event and c.credential_id = p_credential;
  if found then return; end if;

  insert into nonces (nonce) values (p_nonce) on conflict do nothing;
  if not found then
    return query select 'replay'::text, null::timestamptz;
    return;
  end if;

  insert into checkins (event_id, credential_id) values (p_event, p_credential)
    on conflict do nothing;
  if not found then -- lost the race to another scanner
    return query select 'repeat'::text, c.checked_in_at from checkins c
      where c.event_id = p_event and c.credential_id = p_credential;
    return;
  end if;

  return query select 'admit'::text, now();
end $$;

-- The scan service uses the service-role key (bypasses RLS). Attendees only see their own rows.
alter table orgs enable row level security;
alter table users enable row level security;
alter table events enable row level security;
alter table credentials enable row level security;
alter table checkins enable row level security;
alter table nonces enable row level security;

create policy "read own profile" on users for select using (id = (select auth.uid()));
create policy "read events" on events for select using (true);
create policy "read orgs" on orgs for select using (true);
create policy "read own credentials" on credentials for select using (holder_id = (select auth.uid()));
create policy "read own checkins" on checkins for select using (
  exists (select 1 from credentials c where c.id = credential_id and c.holder_id = (select auth.uid()))
);
create policy "no public access" on nonces for all using (false);

revoke execute on function check_in from public, anon, authenticated;
