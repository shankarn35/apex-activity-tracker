import { supabase } from '../supabaseClient'

// All occurrence_dates already materialized (completed) for a recurring
// template — used to keep a recomputed due_date from landing on a date
// that's already been completed.
export async function fetchOccurrenceDates(templateId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('occurrence_date')
    .eq('parent_task_id', templateId)

  if (error) throw error

  return new Set(data.map((row) => row.occurrence_date))
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
