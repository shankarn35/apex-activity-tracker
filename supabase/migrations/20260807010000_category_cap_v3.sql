-- Lowers the category cap from 10 to 9, matching the drop from a 10-color
-- to a 9-color category palette (the lime slot was removed rather than
-- replaced) — keeps the "every category gets a distinct color, no reuse"
-- guarantee intact. Additive only: create-or-replace on an existing
-- function, no DROP/DELETE/TRUNCATE, no existing category rows touched.
-- Confirmed via manual check before this migration: no user currently has
-- 10+ categories, so no existing data is affected.

create or replace function public.enforce_category_cap()
returns trigger as $$
begin
  if (select count(*) from public.categories where user_id = new.user_id) >= 9 then
    raise exception 'Category limit reached: a user may have at most 9 categories';
  end if;
  return new;
end;
$$ language plpgsql;
