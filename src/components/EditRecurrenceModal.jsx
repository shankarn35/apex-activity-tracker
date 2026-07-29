import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { nextTemplateSchedule } from '../lib/recurrence'
import { fetchOccurrenceDates } from '../lib/occurrences'
import { friendlyErrorMessage } from '../lib/errors'
import RecurrenceFields from './RecurrenceFields'

function buildRecurrenceRule(recurrence) {
  return {
    type: recurrence.type,
    ...(recurrence.type !== 'custom_dates' ? { interval: Number(recurrence.interval) || 1 } : {}),
    ...(recurrence.type === 'weekly' && recurrence.daysOfWeek.length
      ? { days_of_week: recurrence.daysOfWeek }
      : {}),
    ...(recurrence.type === 'positional_monthly'
      ? { weekday: recurrence.weekday, positions: recurrence.positions }
      : {}),
    ...(recurrence.type === 'custom_dates' ? { dates: recurrence.dates } : {}),
    ...(recurrence.type !== 'custom_dates' && recurrence.endDate
      ? { end_date: recurrence.endDate }
      : {}),
  }
}

export default function EditRecurrenceModal({ task, onSaved, onClose }) {
  const [recurrence, setRecurrence] = useState({
    type: task.recurrence_rule.type,
    interval: task.recurrence_rule.interval ?? 1,
    daysOfWeek: task.recurrence_rule.days_of_week ?? [],
    endDate: task.recurrence_rule.end_date ?? '',
    weekday: task.recurrence_rule.weekday ?? 1,
    positions: task.recurrence_rule.positions ?? [],
    dates: task.recurrence_rule.dates ?? [],
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const updateRecurrence = (patch) => setRecurrence((prev) => ({ ...prev, ...patch }))

  const handleSave = async (e) => {
    e.preventDefault()
    setMessage('')

    if (recurrence.type === 'custom_dates' && recurrence.dates.length === 0) {
      setMessage('Add at least one date for a custom-dates recurrence.')
      return
    }
    if (recurrence.type === 'positional_monthly' && recurrence.positions.length === 0) {
      setMessage('Select at least one position (e.g. 1st, Last).')
      return
    }

    setLoading(true)

    const recurrenceRule = buildRecurrenceRule(recurrence)

    try {
      const excludedDates = await fetchOccurrenceDates(task.id)
      const schedule = nextTemplateSchedule(
        recurrenceRule,
        task.recurrence_start_date,
        undefined,
        excludedDates
      )

      const { data, error } = await supabase
        .from('tasks')
        .update({
          recurrence_rule: recurrenceRule,
          due_date: schedule.due_date,
          recurrence_active: schedule.recurrence_active,
        })
        .eq('id', task.id)
        .select()
        .single()

      if (error) throw error

      onSaved(data)
    } catch (error) {
      setMessage(friendlyErrorMessage(error))
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Edit recurrence — {task.title}</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSave}>
          <RecurrenceFields
            type={recurrence.type}
            interval={recurrence.interval}
            daysOfWeek={recurrence.daysOfWeek}
            endDate={recurrence.endDate}
            weekday={recurrence.weekday}
            positions={recurrence.positions}
            dates={recurrence.dates}
            onChange={updateRecurrence}
          />

          {message && <p className="task-form-message">{message}</p>}

          <div className="modal-actions">
            <button type="button" className="modal-secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
