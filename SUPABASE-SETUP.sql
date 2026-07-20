-- PROFILES: extends auth.users with role
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  role text not null default 'user',
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- APP CONFIG: prompts, MCP URL, reference HTML
create table if not exists app_config (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

insert into app_config (key, value) values
  ('prompt_websites', ''),
  ('prompt_reports', ''),
  ('prompt_saas', ''),
  ('prompt_deck', ''),
  ('mcp_url', ''),
  ('html_reference_deck', ''),
  ('html_reference_design_system', '')
on conflict (key) do nothing;

-- PROJECTS: one per user deliverable
create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null,
  last_html text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- MESSAGES: conversation history per project
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);

-- RLS
alter table profiles enable row level security;
alter table app_config enable row level security;
alter table projects enable row level security;
alter table messages enable row level security;

-- profiles: users see and update only their own
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- app_config: authenticated users can read; only admin role can write
create policy "config_read" on app_config for select using (auth.role() = 'authenticated');
create policy "config_write" on app_config for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- projects: users see only their own
create policy "projects_own" on projects for all using (auth.uid() = user_id);

-- messages: users see only messages from their own projects
create policy "messages_own" on messages for all using (
  exists (select 1 from projects where id = project_id and user_id = auth.uid())
);
