-- Tasks module: core table + RLS policies
-- A row is either:
--   1. A standalone (non-recurring) task, or
--   2. A recurring template (is_recurring = true, parent_task_id is null), or
--   3. A completed occurrence of a recurring template (parent_task_id set,
--      occurrence_date set) — created only at the moment that occurrence is
--      marked done, so completion history lives in real rows without
--      pre-generating every future date.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  title text not null,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),

  due_date date,

  is_recurring boolean not null default false,
  recurrence_rule text
    check (recurrence_rule in ('daily', 'weekly', 'monthly')),
  recurrence_start_date date,

  -- Set only on rows that represent one completed occurrence of a
  -- recurring template. Null for standalone tasks and for the template
  -- row itself.
  parent_task_id uuid references public.tasks (id) on delete cascade,
  occurrence_date date,

  completed boolean not null default false,
  completed_at timestamptz,

  time_logged_minutes integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A recurring template must define how it recurs and where it starts.
  constraint recurring_fields_required check (
    not is_recurring
    or (recurrence_rule is not null and recurrence_start_date is not null)
  ),

  -- An occurrence instance must reference its template and the date it
  -- covers; a row can't be both a template and an occurrence instance.
  constraint occurrence_fields_consistent check (
    (parent_task_id is null and occurrence_date is null)
    or (parent_task_id is not null and occurrence_date is not null and not is_recurring)
  ),

  -- Prevent double-completing the same calendar occurrence of a template.
  constraint unique_occurrence_per_template unique (parent_task_id, occurrence_date)
);

create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_parent_task_id_idx on public.tasks (parent_task_id)
  where parent_task_id is not null;
create index if not exists tasks_due_date_idx on public.tasks (due_date)
  where due_date is not null;

-- Keep updated_at current on every edit.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row
  execute function public.set_updated_at();

-- RLS: every row is scoped to its owning user.
alter table public.tasks enable row level security;

drop policy if exists "Users can select own tasks" on public.tasks;
create policy "Users can select own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own tasks" on public.tasks;
create policy "Users can insert own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own tasks" on public.tasks;
create policy "Users can update own tasks"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own tasks" on public.tasks;
create policy "Users can delete own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);
