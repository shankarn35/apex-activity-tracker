import { useState, useEffect, useRef } from 'react'
import { format, subDays } from 'date-fns'
import { Settings } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { friendlyErrorMessage } from '../lib/errors'

const FIELDS_STORAGE_KEY = 'completedHistoryFields'
const DEFAULT_FIELDS = { dueDate: true, recurring: true }

function readStoredFields() {
  const stored = localStorage.getItem(FIELDS_STORAGE_KEY)
  if (!stored) return DEFAULT_FIELDS

  try {
    const parsed = JSON.parse(stored)
    return {
      dueDate: parsed.dueDate ?? true,
      recurring: parsed.recurring ?? true,
    }
  } catch {
    return DEFAULT_FIELDS
  }
}

function defaultFromDate() {
  return format(subDays(new Date(), 30), 'yyyy-MM-dd')
}

function parseDateOnly(dateStr) {
  return new Date(`${dateStr}T00:00:00`)
}

export default function CompletedHistory({ userId, showPriority, onToggleShowPriority }) {
  const [expanded, setExpanded] = useState(false)
  const [fromDate, setFromDate] = useState(defaultFromDate())
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState(readStoredFields)
  const [fieldsMenuOpen, setFieldsMenuOpen] = useState(false)
  const fieldsMenuRef = useRef(null)

  useEffect(() => {
    if (!expanded) return

    let cancelled = false

    async function loadHistory() {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('completed_at', `${fromDate}T00:00:00`)
        .order('completed_at', { ascending: false })

      if (cancelled) return

      if (error) {
        setError(friendlyErrorMessage(error))
      } else {
        setItems(data)
      }
      setLoading(false)
    }

    loadHistory()
    return () => {
      cancelled = true
    }
  }, [expanded, fromDate, userId])

  useEffect(() => {
    if (!fieldsMenuOpen) return

    function handleClickOutside(e) {
      if (fieldsMenuRef.current && !fieldsMenuRef.current.contains(e.target)) {
        setFieldsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [fieldsMenuOpen])

  const toggleField = (key) => {
    setFields((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(FIELDS_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <div className="completed-history">
      <button
        type="button"
        className="completed-history-toggle"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <span className={`completed-history-chevron${expanded ? ' expanded' : ''}`}>▸</span>
        Completed History
      </button>

      {expanded && (
        <div className="completed-history-body">
          <div className="completed-history-controls">
            <label className="completed-history-from">
              Show from
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>

            <div className="completed-history-fields-control">
              <button
                type="button"
                className="completed-history-fields-toggle"
                onClick={() => setFieldsMenuOpen((prev) => !prev)}
                aria-label="Choose visible fields"
                title="Choose visible fields"
              >
                <Settings size={16} />
              </button>

              {fieldsMenuOpen && (
                <div className="fields-menu" ref={fieldsMenuRef}>
                  <label>
                    <input
                      type="checkbox"
                      checked={showPriority}
                      onChange={onToggleShowPriority}
                    />
                    Priority
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={fields.dueDate}
                      onChange={() => toggleField('dueDate')}
                    />
                    Due date
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={fields.recurring}
                      onChange={() => toggleField('recurring')}
                    />
                    Recurring / one-time
                  </label>
                </div>
              )}
            </div>
          </div>

          {error && <p className="task-form-message">{error}</p>}

          {loading ? (
            <p className="placeholder-note">Loading history...</p>
          ) : items.length === 0 ? (
            <p className="placeholder-note">No completions in this range.</p>
          ) : (
            <ul className="task-list">
              {items.map((item) => {
                const dueLabel = item.due_date ?? item.occurrence_date
                return (
                  <li key={item.id} className="task-item task-item-completed">
                    {showPriority && (
                      <>
                        <span className={`priority-dot priority-${item.priority}`} />
                        <span className="task-item-priority-label">{item.priority}</span>
                      </>
                    )}
                    <span className="task-item-title">{item.title}</span>
                    {fields.recurring && (
                      <span className="task-item-recurring-badge">
                        {item.parent_task_id ? 'recurring' : 'one-time'}
                      </span>
                    )}
                    {fields.dueDate && dueLabel && (
                      <span className="task-item-due-date">
                        Due {format(parseDateOnly(dueLabel), 'MMM d, yyyy')}
                      </span>
                    )}
                    <span className="task-item-due-date">
                      Completed {format(new Date(item.completed_at), 'MMM d, yyyy')}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
