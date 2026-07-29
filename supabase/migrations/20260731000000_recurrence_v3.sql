-- Recurrence system v3: two new recurrence types.
--   positional_monthly: { type, interval, weekday (1-7 ISO), positions: ['1'|'2'|'3'|'4'|'-1', ...] }
--     `interval` behaves like the other types — only months that are an
--     exact multiple of `interval` away from recurrence_start_date's month
--     are considered. positions may hold more than one code (e.g. "1st and
--     last Friday" in one rule).
--   custom_dates: { type, dates: ['yyyy-MM-dd', ...] } — 1 to 20 explicit
--     dates; once all are completed or passed, the template exhausts the
--     same way an end_date-based recurrence does today (no separate
--     handling needed).

alter table public.tasks drop constraint if exists recurrence_rule_shape;

alter table public.tasks add constraint recurrence_rule_shape check (
  recurrence_rule is null
  or (
    recurrence_rule ? 'type'
    and recurrence_rule->>'type' in (
      'daily', 'weekly', 'monthly', 'positional_monthly', 'custom_dates'
    )
    and coalesce((recurrence_rule->>'interval')::int, 1) > 0
    and (
      recurrence_rule->>'type' <> 'positional_monthly'
      or (recurrence_rule ? 'weekday' and recurrence_rule ? 'positions')
    )
    and (
      recurrence_rule->>'type' <> 'custom_dates'
      or (
        case
          when jsonb_typeof(recurrence_rule->'dates') = 'array'
            then jsonb_array_length(recurrence_rule->'dates') between 1 and 20
          else false
        end
      )
    )
  )
);
