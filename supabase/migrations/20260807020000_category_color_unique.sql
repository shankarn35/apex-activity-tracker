-- Defense-in-depth: prevents two categories for the same user from ever
-- sharing a color, backing up the app-level "pick an unused palette color"
-- logic against a genuine same-instant race between two tabs/requests.
-- Additive only: no DROP/DELETE/TRUNCATE, no existing data modified.
-- Safe to apply now — the one known duplicate-color pair from testing has
-- already been resolved by deleting the extra category.

alter table public.categories
  add constraint unique_category_color_per_user unique (user_id, color);
