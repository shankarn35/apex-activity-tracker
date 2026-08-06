-- Categories v2: drop presets, add per-category color, raise cap to 10.
--
-- FLAGGED — unlike prior migrations, this one modifies existing data, not
-- just schema:
--   - a DELETE statement removes the 3 preset rows seeded by the original
--     migration (any tasks referencing them get category_id = null
--     automatically, via the existing "on delete set null" FK — expected,
--     not an error)
--   - an UPDATE statement backfills a color onto any category rows created
--     before this migration (e.g. custom categories added during testing)

-- 1. Add the color column. Nullable for now — backfilled below for
--    existing rows; the app assigns one at creation time going forward.
alter table public.categories add column color text;

-- 2. Remove the 3 seeded preset rows. FLAGGED: DELETE.
delete from public.categories where is_preset = true;

-- 3. Backfill a color onto any categories that predate this column,
--    cycling through the same 6-color palette the app uses for new
--    categories, ordered by creation time per user so the assignment is
--    deterministic. FLAGGED: UPDATE (modifies existing rows).
with palette (color, position) as (
  values
    ('#ef4444', 0),
    ('#f59e0b', 1),
    ('#22c55e', 2),
    ('#06b6d4', 3),
    ('#8b5cf6', 4),
    ('#ec4899', 5)
),
ordered as (
  select id, row_number() over (partition by user_id order by created_at) - 1 as idx
  from public.categories
  where color is null
)
update public.categories c
set color = p.color
from ordered o
join palette p on p.position = o.idx % 6
where c.id = o.id;

-- 4. Raise the cap from 5 to 10 — same generic counting logic, only the
--    threshold changes. create-or-replace is enough; the existing trigger
--    already points at this function by name, so it doesn't need touching.
create or replace function public.enforce_category_cap()
returns trigger as $$
begin
  if (select count(*) from public.categories where user_id = new.user_id) >= 10 then
    raise exception 'Category limit reached: a user may have at most 10 categories';
  end if;
  return new;
end;
$$ language plpgsql;

-- 5. Every category now always has a color (backfilled above, and the app
--    guarantees one at creation going forward) — enforce it.
alter table public.categories alter column color set not null;
