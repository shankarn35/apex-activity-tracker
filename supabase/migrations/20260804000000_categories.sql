-- Categories: a single optional category per task, drawn from a per-user
-- set of presets + custom entries, capped at 5 total per user.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  name text not null,
  is_preset boolean not null default false,

  created_at timestamptz not null default now(),

  constraint categories_name_unique_per_user unique (user_id, name)
);

create index categories_user_id_idx on public.categories (user_id);

-- One category per task; deleting a category clears it from any tasks
-- using it rather than blocking the delete or cascading task deletion.
alter table public.tasks
  add column category_id uuid references public.categories (id) on delete set null;

-- Defense-in-depth cap: at most 5 categories per user, enforced at the DB
-- level in addition to the app-level check before showing "add custom
-- category". Works correctly for the lazy 3-preset batch insert too, since
-- a row-level trigger sees earlier rows from the same insert statement.
create or replace function public.enforce_category_cap()
returns trigger as $$
begin
  if (select count(*) from public.categories where user_id = new.user_id) >= 5 then
    raise exception 'Category limit reached: a user may have at most 5 categories';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists categories_enforce_cap on public.categories;
create trigger categories_enforce_cap
  before insert on public.categories
  for each row
  execute function public.enforce_category_cap();

-- RLS: every row is scoped to its owning user.
alter table public.categories enable row level security;

drop policy if exists "Users can select own categories" on public.categories;
create policy "Users can select own categories"
  on public.categories for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own categories" on public.categories;
create policy "Users can insert own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own categories" on public.categories;
create policy "Users can update own categories"
  on public.categories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own categories" on public.categories;
create policy "Users can delete own categories"
  on public.categories for delete
  using (auth.uid() = user_id);
