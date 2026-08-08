import { supabase } from '../supabaseClient'

// All occurrence_dates already materialized (completed or skipped) for a
// recurring template — used to keep a recomputed due_date from landing on
// a date that already has a materialized row of either status.
export async function fetchOccurrenceDates(templateId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('occurrence_date')
    .eq('parent_task_id', templateId)

  if (error) throw error

  return new Set(data.map((row) => row.occurrence_date))
}

// Status of an existing materialized occurrence row for a template at a
// given date, if any — used to build a direction-specific message when an
// insert collides with unique_occurrence_per_template (e.g. distinguishing
// "already completed" from "already skipped").
export async function fetchOccurrenceStatus(templateId, occurrenceDate) {
  const { data, error } = await supabase
    .from('tasks')
    .select('completed, is_skipped')
    .eq('parent_task_id', templateId)
    .eq('occurrence_date', occurrenceDate)
    .maybeSingle()

  if (error) throw error

  return data
}

// Status of a standalone task by id — used to build a direction-specific
// message when an update collides with completed_skipped_mutually_exclusive
// (e.g. distinguishing "already completed" from "already skipped").
export async function fetchTaskStatus(taskId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('completed, is_skipped')
    .eq('id', taskId)
    .maybeSingle()

  if (error) throw error

  return data
}

// Whether a recurring template is currently active — used before undoing a
// completed occurrence, to warn if the undo would also reactivate a series
// the user had deliberately stopped.
export async function fetchRecurrenceActive(templateId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('recurrence_active')
    .eq('id', templateId)
    .single()

  if (error) throw error

  return data.recurrence_active
}
