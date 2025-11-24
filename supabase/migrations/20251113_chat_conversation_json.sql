-- Migrate chat_messages to per-user JSON conversation storage
-- 1) Create a new table with per-user conversation JSONB
create table if not exists public.chat_messages_new (
  user_id uuid primary key references auth.users(id) on delete cascade,
  conversation jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Aggregate existing messages into conversation arrays per user
insert into public.chat_messages_new (user_id, conversation)
select
  cm.user_id,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'sender', cm.sender,
        'message_type', cm.message_type,
        'message', cm.message,
        'created_at', cm.created_at
      ) order by cm.created_at
    ), '[]'::jsonb
  ) as conversation
from public.chat_messages cm
group by cm.user_id
on conflict (user_id) do nothing;

-- 3) Drop old table and rename new
alter table public.chat_messages disable row level security;
drop table public.chat_messages;
alter table public.chat_messages_new rename to chat_messages;

-- 4) Enable RLS and policies
alter table public.chat_messages enable row level security;

create policy chat_messages_select on public.chat_messages
  for select using (auth.uid() = user_id);

create policy chat_messages_insert on public.chat_messages
  for insert with check (auth.uid() = user_id);

create policy chat_messages_update on public.chat_messages
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5) Helpful index on updated_at for maintenance
create index if not exists chat_messages_updated_at_idx on public.chat_messages(updated_at);

-- 6) Grant privileges
grant select, insert, update on public.chat_messages to anon, authenticated;

