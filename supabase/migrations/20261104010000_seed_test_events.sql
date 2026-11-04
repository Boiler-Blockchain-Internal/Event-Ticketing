-- Seed initial test orgs and events for pilot & testing
insert into orgs (id, name)
values
  ('a0000000-0000-0000-0000-000000000001', 'Boiler Blockchain'),
  ('a0000000-0000-0000-0000-000000000002', 'Purdue Hackers')
on conflict (id) do nothing;

insert into events (id, org_id, kind, name, starts_at, doors_open_at, doors_close_at, venue, capacity)
values
  ('bb-fgm', 'a0000000-0000-0000-0000-000000000001', 'event', 'Fall General Meeting', '2026-11-12 19:00:00+00', '2026-11-12 18:45:00+00', '2026-11-12 19:30:00+00', 'Lawson B155', 120),
  ('ph-hack-night', 'a0000000-0000-0000-0000-000000000002', 'event', 'Spring Hack Night', '2026-11-20 18:00:00+00', '2026-11-20 17:45:00+00', '2026-11-20 22:00:00+00', 'WALC', 60)
on conflict (id) do nothing;
