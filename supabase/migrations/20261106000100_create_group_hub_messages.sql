create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_name text not null check (sender_name in ('Marc', 'Willson', 'Nando', 'Rosh')),
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

grant select, insert on public.messages to anon, authenticated;

create policy "Anyone can read group messages"
  on public.messages for select
  to anon, authenticated
  using (true);

create policy "Group members can post messages"
  on public.messages for insert
  to anon, authenticated
  with check (
    sender_name in ('Marc', 'Willson', 'Nando', 'Rosh')
    and char_length(btrim(content)) between 1 and 2000
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;
