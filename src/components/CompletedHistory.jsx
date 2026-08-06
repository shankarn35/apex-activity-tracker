import { useState, useEffect, useRef } from 'react'
import { format, subDays } from 'date-fns'
import { Settings } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { fetchRecurrenceActive } from '../lib/occurrences'
import { categoryTint } from '../lib/categories'
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

const DEFAULT_VISIBLE_COUNT = 10

const DEFAULT_UNDO_MESSAGE = 'Undo this completion?'
const REACTIVATE_UNDO_MESSAGE =
  'This will also reactivate the recurring series (currently stopped). Continue?'

export default function CompletedHistory({
  userId,
  showPriority,
  onToggleShowPriority,
  onUncomplete,
  newlyCompletedItem,
  categories,
}) {
  const [expanded, setExpanded] = useState(false)
  const [fromDate, setFromDate] = useState(defaultFromDate())
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState(readStoredFields)
  const [fieldsMenuOpen, setFieldsMenuOpen] = useState(false)
  const fieldsMenuRef = useRef(null)
  const [showAll, setShowAll] = useState(false)

  const [undoTarget, setUndoTarget] = useState(null)
  const [undoMessage, setUndoMessage] = useState(DEFAULT_UNDO_MESSAGE)
  const [undoChecking, setUndoChecking] = useState(false)
  const [undoSubmitting, setUndoSubmitting] = useState(false)
  const undoPopoverRef = useRef(null)

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

  const [seenCompletedItem, setSeenCompletedItem] = useState(newlyCompletedItem)
  if (newlyCompletedItem && newlyCompletedItem !== seenCompletedItem) {
    setSeenCompletedItem(newlyCompletedItem)
    if (newlyCompletedItem.completed_at >= `${fromDate}T00:00:00`) {
      setItems((prev) =>
        [...prev, newlyCompletedItem].sort((a, b) => b.completed_at.localeCompare(a.completed_at))
      )
    }
  }

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

  useEffect(() => {
    if (!undoTarget) return

    function handleClickOutside(e) {
      if (undoPopoverRef.current && !undoPopoverRef.current.contains(e.target)) {
        setUndoTarget(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [undoTarget])

  const toggleField = (key) => {
    setFields((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(FIELDS_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const openUndoConfirm = async (item) => {
    setError('')
    setUndoTarget(item)
    setUndoMessage(DEFAULT_UNDO_MESSAGE)

    if (!item.parent_task_id) return

    setUndoChecking(true)
    try {
      const active = await fetchRecurrenceActive(item.parent_task_id)
      if (!active) {
        setUndoMessage(REACTIVATE_UNDO_MESSAGE)
      }
    } catch (err) {
      setError(friendlyErrorMessage(err))
      setUndoTarget(null)
    } finally {
      setUndoChecking(false)
    }
  }

  const confirmUndo = async () => {
    const item = undoTarget
    setUndoSubmitting(true)
    setError('')

    try {
      let restoredTask

      if (!item.parent_task_id) {
        const { data, error } = await supabase
          .from('tasks')
          .update({ completed: false, completed_at: null })
          .eq('id', item.id)
          .select()
          .single()

        if (error) throw error
        restoredTask = data
      } else {
        const { error: deleteError } = await supabase
          .from('tasks')
          .delete()
          .eq('id', item.id)

        if (deleteError) throw deleteError

        const { data: template, error: templateFetchError } = await supabase
          .from('tasks')
          .select('due_date')
          .eq('id', item.parent_task_id)
          .single()

        if (templateFetchError) throw templateFetchError

        // Undoing must only ever move due_date backward — an out-of-order
        // undo (e.g. undoing an earlier date after a later one is already
        // undone) must not clobber that earlier, still-outstanding gap.
        const newDueDate =
          template.due_date === null || item.occurrence_date < template.due_date
            ? item.occurrence_date
            : template.due_date

        const { data, error } = await supabase
          .from('tasks')
          .update({ due_date: newDueDate, recurrence_active: true })
          .eq('id', item.parent_task_id)
          .select()
          .single()

        if (error) throw error
        restoredTask = data
      }

      setItems((prev) => prev.filter((i) => i.id !== item.id))
      onUncomplete(restoredTask)
      setUndoTarget(null)
    } catch (err) {
      setError(friendlyErrorMessage(err))
    } finally {
      setUndoSubmitting(false)
    }
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
            <div className="completed-history-scope">
              <label className="completed-history-from">
                Show from
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </label>

              {items.length > DEFAULT_VISIBLE_COUNT && (
                <label className="show-all-toggle">
                  <input
                    type="checkbox"
                    checked={showAll}
                    onChange={() => setShowAll((prev) => !prev)}
                  />
                  Show all
                </label>
              )}
            </div>

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
            <>
              {items.length > DEFAULT_VISIBLE_COUNT && (
                <p className="placeholder-note completed-history-count-note">
                  {showAll
                    ? `Showing all ${items.length} (within ${format(parseDateOnly(fromDate), 'MMM d')} – today).`
                    : `Showing ${DEFAULT_VISIBLE_COUNT} most recent (within ${format(parseDateOnly(fromDate), 'MMM d')} – today) — ${items.length - DEFAULT_VISIBLE_COUNT} more available.`}
                </p>
              )}

              <ul className="task-list">
              {(showAll ? items : items.slice(0, DEFAULT_VISIBLE_COUNT)).map((item) => {
                const dueLabel = item.due_date ?? item.occurrence_date
                const category = categories.find((c) => c.id === item.category_id)
                return (
                  <li key={item.id} className="task-item task-item-completed">
                    {showPriority && (
                      <>
                        <span className={`priority-dot priority-${item.priority}`} />
                        <span className="task-item-priority-label">{item.priority}</span>
                      </>
                    )}
                    <span className="task-item-title">{item.title}</span>
                    {category && (
                      <span
                        className="task-item-category-badge"
                        style={{
                          backgroundColor: categoryTint(category.color),
                          color: category.color,
                          borderColor: category.color,
                        }}
                      >
                        {category.name}
                      </span>
                    )}
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

                    <div className="task-item-undo-control">
                      <button
                        type="button"
                        className="task-item-undo-button"
                        onClick={() => openUndoConfirm(item)}
                      >
                        Undo
                      </button>

                      {undoTarget?.id === item.id && (
                        <div className="undo-popover" ref={undoPopoverRef}>
                          {undoChecking ? (
                            <p className="placeholder-note">Checking...</p>
                          ) : (
                            <>
                              <p className="undo-popover-message">{undoMessage}</p>
                              <div className="complete-popover-actions">
                                <button
                                  type="button"
                                  className="modal-secondary-button"
                                  onClick={() => setUndoTarget(null)}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={confirmUndo}
                                  disabled={undoSubmitting}
                                >
                                  {undoSubmitting ? 'Undoing...' : 'Confirm'}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
