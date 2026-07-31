import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { formatRuleSummary, today } from '../lib/recurrence'

export default function TaskItem({ task, onComplete, onEditRecurrence, showPriority }) {
  const [confirming, setConfirming] = useState(false)
  const [completedOn, setCompletedOn] = useState(today())
  const popoverRef = useRef(null)

  useEffect(() => {
    if (!confirming) return

    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setConfirming(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [confirming])

  const dueDateLabel = task.due_date
    ? format(new Date(`${task.due_date}T00:00:00`), 'MMM d, yyyy')
    : 'No due date'

  const openPopover = () => {
    setCompletedOn(today())
    setConfirming(true)
  }

  const handleConfirm = () => {
    onComplete(task, completedOn)
    setConfirming(false)
  }

  return (
    <li className="task-item">
      <div className="task-item-complete-control">
        <button
          type="button"
          className="task-item-checkbox"
          onClick={openPopover}
          aria-label={`Mark "${task.title}" complete`}
        />

        {confirming && (
          <div className="complete-popover" ref={popoverRef}>
            <label className="complete-popover-label">
              Completed on:
              <input
                type="date"
                value={completedOn}
                max={today()}
                onChange={(e) => setCompletedOn(e.target.value)}
              />
            </label>
            <div className="complete-popover-actions">
              <button
                type="button"
                className="modal-secondary-button"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
              <button type="button" onClick={handleConfirm}>
                Confirm
              </button>
            </div>
          </div>
        )}
      </div>

      {showPriority && (
        <>
          <span className={`priority-dot priority-${task.priority}`} />
          <span className="task-item-priority-label">{task.priority}</span>
        </>
      )}

      <span className="task-item-title">{task.title}</span>

      {task.is_recurring && (
        <span className="task-item-recurring-badge">
          {formatRuleSummary(task.recurrence_rule)}
        </span>
      )}

      {task.is_recurring && (
        <button
          type="button"
          className="task-item-edit-recurrence"
          onClick={() => onEditRecurrence(task)}
        >
          Edit
        </button>
      )}

      <span className="task-item-due-date">{dueDateLabel}</span>
    </li>
  )
}
