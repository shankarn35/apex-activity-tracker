-- Adds a "Skip / Not Needed" status alongside "completed", for both
-- standalone tasks and materialized recurring occurrences. Additive only:
-- no DROP/DELETE/TRUNCATE, no modification of existing data.

alter table public.tasks
  add column is_skipped boolean not null default false,
  add column skipped_at timestamptz,
  add column comment text;

alter table public.tasks
  add constraint completed_skipped_mutually_exclusive
    check (not (completed and is_skipped));

comment on constraint unique_occurrence_per_template on public.tasks is
  'Covers both completed and skipped materialized occurrence rows for a given (parent_task_id, occurrence_date) — not partial, so this was already true before is_skipped existed.';

create index tasks_skipped_at_idx on public.tasks (user_id, skipped_at desc)
  where is_skipped = true;
