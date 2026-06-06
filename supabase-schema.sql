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

-- RLS無効化（MVP: API Routeで制御）
alter table participants disable row level security;
alter table registrations disable row level security;
alter table lunch_groups disable row level security;
