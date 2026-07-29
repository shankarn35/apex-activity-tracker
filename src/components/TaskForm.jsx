import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { nextTemplateSchedule } from '../lib/recurrence'
import { friendlyErrorMessage } from '../lib/errors'
import RecurrenceFields from './RecurrenceFields'

const DEFAULT_RECURRENCE = {
  type: 'daily',
  interval: 1,
  daysOfWeek: [],
  endDate: '',
  weekday: 1,
  positions: [],
  dates: [],
}

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

export default function TaskForm({ userId, onCreated }) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrence, setRecurrence] = useState(DEFAULT_RECURRENCE)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const updateRecurrence = (patch) => setRecurrence((prev) => ({ ...prev, ...patch }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    if (isRecurring && recurrence.type === 'custom_dates' && recurrence.dates.length === 0) {
      setMessage('Add at least one date for a custom-dates recurrence.')
      return
    }
    if (isRecurring && recurrence.type === 'positional_monthly' && recurrence.positions.length === 0) {
      setMessage('Select at least one position (e.g. 1st, Last).')
      return
    }

    setLoading(true)

    const recurrenceRule = isRecurring ? buildRecurrenceRule(recurrence) : null
    const recurrenceStartDate = isRecurring
      ? recurrence.type === 'custom_dates'
        ? [...recurrence.dates].sort()[0]
        : dueDate || null
      : null

    const schedule = isRecurring && recurrenceStartDate
      ? nextTemplateSchedule(recurrenceRule, recurrenceStartDate, recurrenceStartDate)
      : null

    const newTask = {
      user_id: userId,
      title: title.trim(),
      priority,
      due_date: isRecurring ? schedule?.due_date ?? null : dueDate || null,
      is_recurring: isRecurring,
      recurrence_rule: recurrenceRule,
      recurrence_start_date: recurrenceStartDate,
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert(newTask)
        .select()
        .single()

      if (error) throw error

      onCreated(data)
      setTitle('')
      setPriority('medium')
      setDueDate('')
      setIsRecurring(false)
      setRecurrence(DEFAULT_RECURRENCE)
    } catch (error) {
      setMessage(friendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="task-form-row">
        <input
          type="text"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="task-form-title"
        />

        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        {!(isRecurring && recurrence.type === 'custom_dates') && (
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Task'}
        </button>
      </div>

      <div className="task-form-row task-form-recurring">
        <label className="task-form-toggle">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
          />
          Make this recurring
        </label>
      </div>

      {isRecurring && (
        <RecurrenceFields
          type={recurrence.type}
          interval={recurrence.interval}
          daysOfWeek={recurrence.daysOfWeek}
          endDate={recurrence.endDate}
          weekday={recurrence.weekday}
          positions={recurrence.positions}
          dates={recurrence.dates}
          minEndDate={dueDate || undefined}
          onChange={updateRecurrence}
        />
      )}

      {message && <p className="task-form-message">{message}</p>}
    </form>
  )
}
