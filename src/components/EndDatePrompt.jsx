import { useState } from 'react'
import { today } from '../lib/recurrence'

function EndDateResolutionCard({ task, onResolve }) {
  const [pickingNewDate, setPickingNewDate] = useState(false)
  const [newEndDate, setNewEndDate] = useState('')

  return (
    <div className="end-date-card">
      <p className="end-date-card-title">
        <strong>{task.title}</strong>'s end date ({task.recurrence_rule.end_date}) has passed.
      </p>

      {!pickingNewDate ? (
        <div className="end-date-card-actions">
          <button type="button" onClick={() => onResolve(task, 'continue')}>
            Continue indefinitely
          </button>
          <button type="button" onClick={() => setPickingNewDate(true)}>
            Set a new end date
          </button>
          <button
            type="button"
            className="modal-secondary-button"
            onClick={() => onResolve(task, 'stop')}
          >
            Stop recurring
          </button>
        </div>
      ) : (
        <div className="end-date-card-actions">
          <input
            type="date"
            min={today()}
            value={newEndDate}
            onChange={(e) => setNewEndDate(e.target.value)}
          />
          <button
            type="button"
            disabled={!newEndDate}
            onClick={() => onResolve(task, 'newEndDate', newEndDate)}
          >
            Confirm
          </button>
          <button
            type="button"
            className="modal-secondary-button"
            onClick={() => setPickingNewDate(false)}
          >
            Back
          </button>
        </div>
      )}
    </div>
  )
}

export default function EndDatePrompt({ mode, pendingTasks, onChooseMode, onResolve, onClose }) {
  if (pendingTasks.length === 0) return null

  if (mode === 'choice') {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-header">
            <h3>{pendingTasks.length} recurring tasks need attention</h3>
            <button type="button" className="modal-close" onClick={onClose}>
              ×
            </button>
          </div>
          <p className="modal-subtitle">
            Their end dates have passed. How would you like to review them?
          </p>
          <div className="modal-actions">
            <button type="button" onClick={() => onChooseMode('sequential')}>
              Review one at a time
            </button>
            <button type="button" onClick={() => onChooseMode('bulk')}>
              See all and decide now
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'sequential') {
    const task = pendingTasks[0]
    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-header">
            <h3>Recurring task end date passed</h3>
            <button type="button" className="modal-close" onClick={onClose}>
              ×
            </button>
          </div>
          <EndDateResolutionCard task={task} onResolve={onResolve} />
          {pendingTasks.length > 1 && (
            <p className="placeholder-note">{pendingTasks.length - 1} more after this one.</p>
          )}
        </div>
      </div>
    )
  }

  if (mode === 'bulk') {
    return (
      <div className="modal-overlay">
        <div className="modal modal-wide">
          <div className="modal-header">
            <h3>Recurring tasks needing attention</h3>
            <button type="button" className="modal-close" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="end-date-card-list">
            {pendingTasks.map((task) => (
              <EndDateResolutionCard key={task.id} task={task} onResolve={onResolve} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return null
}
