-- 参加者テーブル
create table participants (
  id           uuid primary key default gen_random_uuid(),
  anonymous_id varchar unique not null,
  nickname     varchar not null,
  available_days text[] default '{}',
  created_at   timestamp with time zone default now(),
  updated_at   timestamp with time zone default now()
);

-- 参加登録テーブル（週次）
create table registrations (
  id            uuid primary key default gen_random_uuid(),
  anonymous_id  varchar not null,
  lunch_date    date not null,
  status        varchar default 'registered',
  registered_at timestamp with time zone default now(),
  cancelled_at  timestamp with time zone,
  unique(anonymous_id, lunch_date)
);

-- ランチグループテーブル
create table lunch_groups (
  id           uuid primary key default gen_random_uuid(),
  lunch_date   date not null,
  member_ids   text[] not null,
  nicknames    text[] not null,
  status       varchar default 'pending',
  confirmed_at timestamp with time zone,
  notified_at  timestamp with time zone
);

-- グループチャットメッセージテーブル
create table chat_messages (
  id             uuid primary key default gen_random_uuid(),
  lunch_group_id uuid not null references lunch_groups(id) on delete cascade,
  anonymous_id   varchar not null,
  nickname       varchar not null,
  message        varchar not null,
  created_at     timestamp with time zone default now()
);

create index chat_messages_lunch_group_id_idx on chat_messages (lunch_group_id, created_at);

-- RLS無効化（MVP: API Routeで制御）
alter table participants disable row level security;
alter table registrations disable row level security;
alter table lunch_groups disable row level security;
alter table chat_messages disable row level security;

-- リアルタイム配信を有効化（チャットの即時反映に使用）
alter publication supabase_realtime add table chat_messages;
