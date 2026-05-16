
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

-- Trades
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  pair text not null,
  trade_date timestamptz not null default now(),
  session text,                       -- london / new_york / asia
  direction text not null,            -- buy / sell
  bias text,                          -- bullish / bearish
  risk_percent numeric,
  position_size numeric,
  entry_price numeric,
  stop_loss numeric,
  take_profit numeric,
  rr_ratio numeric,
  pnl numeric default 0,
  outcome text,                       -- win / loss / breakeven
  tags text[] default '{}',

  -- Execution / review
  execution_notes text,
  respected_analysis boolean,
  execution_correct boolean,
  mistakes text,
  lessons text,
  improvements text,
  replay_notes text,

  -- Emotional
  emotion_before text,
  emotion_during text,
  emotion_after text,
  fear_level int,                     -- 0-10
  confidence_level int,
  discipline_rating int,
  patience_rating int,
  revenge_trading boolean default false,
  overtrading boolean default false,
  fomo boolean default false,
  journal_notes text,

  -- Multi-timeframe analyses, stored as flexible JSON.
  -- Shape: { monthly: {...}, weekly: {...}, daily: {...}, h4: {...}, h1: {...} }
  -- Each value: { structure, bias, flags: {fvg, bos, choch, ...}, rr_expectation, confidence, notes }
  timeframe_analysis jsonb not null default '{}'::jsonb,

  -- Optional advanced SMC fields
  smc_extras jsonb not null default '{}'::jsonb,
  -- { inducement, internal_liquidity, external_liquidity, smt_divergence, ote_entry,
  --   session_liquidity, macro_bias, kill_zone, manipulation, distribution_accumulation }

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trades_user_date_idx on public.trades(user_id, trade_date desc);
alter table public.trades enable row level security;
create policy "own trades all" on public.trades for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Screenshots
create table public.trade_screenshots (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  storage_path text,
  kind text default 'before',  -- before / after / other
  caption text,
  created_at timestamptz not null default now()
);
create index trade_screenshots_trade_idx on public.trade_screenshots(trade_id);
alter table public.trade_screenshots enable row level security;
create policy "own screenshots all" on public.trade_screenshots for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notes
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text,
  category text default 'general',  -- lessons / psychology / strategy / observations / general
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.notes enable row level security;
create policy "own notes all" on public.notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Generic updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trades_set_updated before update on public.trades for each row execute function public.set_updated_at();
create trigger notes_set_updated before update on public.notes for each row execute function public.set_updated_at();
create trigger profiles_set_updated before update on public.profiles for each row execute function public.set_updated_at();

-- Storage bucket for screenshots
insert into storage.buckets (id, name, public) values ('trade-screenshots', 'trade-screenshots', true)
on conflict (id) do nothing;

create policy "screenshots public read" on storage.objects for select using (bucket_id = 'trade-screenshots');
create policy "screenshots own upload" on storage.objects for insert with check (bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "screenshots own update" on storage.objects for update using (bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "screenshots own delete" on storage.objects for delete using (bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);
