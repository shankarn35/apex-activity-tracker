import { useState, useEffect } from 'react'
import { format, subDays } from 'date-fns'
import { supabase } from '../supabaseClient'
import { friendlyErrorMessage } from '../lib/errors'

function defaultFromDate() {
  return format(subDays(new Date(), 30), 'yyyy-MM-dd')
}

function parseDateOnly(dateStr) {
  return new Date(`${dateStr}T00:00:00`)
}

export default function CompletedHistory({ userId }) {
  const [expanded, setExpanded] = useState(false)
  const [fromDate, setFromDate] = useState(defaultFromDate())
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
          <label className="completed-history-from">
            Show from
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>

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
                    <span className={`priority-dot priority-${item.priority}`} />
                    <span className="task-item-title">{item.title}</span>
                    <span className="task-item-priority-label">{item.priority}</span>
                    {item.parent_task_id && (
                      <span className="task-item-recurring-badge">recurring</span>
                    )}
                    {dueLabel && (
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
