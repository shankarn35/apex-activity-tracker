import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { formatRuleSummary, today } from '../lib/recurrence'
import { categoryTint } from '../lib/categories'

export default function TaskItem({
  task,
  onComplete,
  onSkip,
  onEditRecurrence,
  showPriority,
  showCategory,
  categories,
}) {
  const category = categories.find((c) => c.id === task.category_id)
  const [confirming, setConfirming] = useState(false)
  const [completedOn, setCompletedOn] = useState(today())
  const [completeComment, setCompleteComment] = useState('')
  const popoverRef = useRef(null)
  const [skipConfirming, setSkipConfirming] = useState(false)
  const [skipComment, setSkipComment] = useState('')
  const skipPopoverRef = useRef(null)

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

  useEffect(() => {
    if (!skipConfirming) return

    function handleClickOutside(e) {
      if (skipPopoverRef.current && !skipPopoverRef.current.contains(e.target)) {
        setSkipConfirming(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [skipConfirming])

  const dueDateLabel = task.due_date
    ? format(new Date(`${task.due_date}T00:00:00`), 'MMM d, yyyy')
    : 'No due date'

  const openPopover = () => {
    setCompletedOn(today())
    setCompleteComment('')
    setConfirming(true)
  }

  const handleConfirm = () => {
    onComplete(task, completedOn, completeComment)
    setConfirming(false)
  }

  const openSkipPopover = () => {
    setSkipComment('')
    setSkipConfirming(true)
  }

  const handleSkipConfirm = () => {
    onSkip(task, today(), skipComment)
    setSkipConfirming(false)
  }

  return (
    <li className="task-item">
      <div className="task-item-status-buttons">
        <div className="task-item-status-control">
          <button
            type="button"
            className="task-item-status-button task-item-status-button--complete"
            onClick={openPopover}
            aria-label={`Mark "${task.title}" complete`}
          >
            Complete
          </button>

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
              <label className="complete-popover-label">
                Comment (optional):
                <textarea
                  value={completeComment}
                  onChange={(e) => setCompleteComment(e.target.value)}
                  rows={2}
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

        <div className="task-item-status-control">
          <button
            type="button"
            className="task-item-status-button task-item-status-button--skip"
            onClick={openSkipPopover}
            aria-label={`Mark "${task.title}" Skip / Not Needed`}
            title="Skip / Not Needed"
          >
            Skip
          </button>

          {skipConfirming && (
            <div className="complete-popover" ref={skipPopoverRef}>
              <label className="complete-popover-label">
                Comment (optional):
                <textarea
                  value={skipComment}
                  onChange={(e) => setSkipComment(e.target.value)}
                  rows={2}
                />
              </label>
              <div className="complete-popover-actions">
                <button
                  type="button"
                  className="modal-secondary-button"
                  onClick={() => setSkipConfirming(false)}
                >
                  Cancel
                </button>
                <button type="button" onClick={handleSkipConfirm}>
                  Confirm
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPriority && (
        <>
          <span className={`priority-dot priority-${task.priority}`} />
          <span className="task-item-priority-label">{task.priority}</span>
        </>
      )}

      <span className="task-item-title">{task.title}</span>

      {showCategory && category && (
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
