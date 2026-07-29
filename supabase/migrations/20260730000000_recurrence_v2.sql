-- Recurrence system v2:
--   - recurrence_rule becomes jsonb: { type, interval, days_of_week?, end_date? }
--     type: 'daily' | 'weekly' | 'monthly'
--     interval: positive integer, "every N <type>s"
--     days_of_week: only for type = 'weekly'; ISO weekday numbers 1 (Mon)..7 (Sun)
--     end_date: optional 'yyyy-MM-dd'; absent means the series recurs indefinitely
--   - recurrence_active tracks whether a template still produces future
--     occurrences. Flipped to false when the user chooses "stop recurring"
--     on the end-date prompt, or automatically when the next computed
--     occurrence would fall after end_date.

-- 1. Convert recurrence_rule from the old three-value text enum to jsonb,
--    preserving any rows already created under the old shape.
alter table public.tasks drop constraint if exists tasks_recurrence_rule_check;

alter table public.tasks
  alter column recurrence_rule type jsonb
  using (
    case
      when recurrence_rule is null then null
      else jsonb_build_object('type', recurrence_rule, 'interval', 1)
    end
  );

-- 2. Lightweight shape validation. Deep validation of `days_of_week`
--    contents and `end_date` format is left to the app layer.
alter table public.tasks add constraint recurrence_rule_shape check (
  recurrence_rule is null
  or (
    recurrence_rule ? 'type'
    and recurrence_rule->>'type' in ('daily', 'weekly', 'monthly')
    and coalesce((recurrence_rule->>'interval')::int, 1) > 0
  )
);

-- 3. Whether this recurring template still generates future occurrences.
alter table public.tasks
  add column if not exists recurrence_active boolean not null default true;

-- 4. Supports the (upcoming) completed-history view — most recent first,
--    filtered by a from-date — without scanning the whole table.
create index if not exists tasks_completed_at_idx
  on public.tasks (user_id, completed_at desc)
  where completed = true;
