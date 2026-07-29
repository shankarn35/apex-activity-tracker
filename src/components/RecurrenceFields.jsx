import { useState } from 'react'
import { WEEKDAY_OPTIONS } from '../lib/recurrence'
import WeekdayToggle from './WeekdayToggle'
import PositionToggle from './PositionToggle'

const MAX_CUSTOM_DATES = 20

function CustomDatesFields({ dates, onChange }) {
  const [pendingDate, setPendingDate] = useState('')

  const addDate = () => {
    if (!pendingDate || dates.includes(pendingDate) || dates.length >= MAX_CUSTOM_DATES) return
    onChange([...dates, pendingDate].sort())
    setPendingDate('')
  }

  const removeDate = (date) => {
    onChange(dates.filter((d) => d !== date))
  }

  return (
    <div className="custom-dates-fields">
      <div className="task-form-row">
        <input
          type="date"
          value={pendingDate}
          onChange={(e) => setPendingDate(e.target.value)}
        />
        <button
          type="button"
          className="modal-secondary-button"
          onClick={addDate}
          disabled={!pendingDate || dates.length >= MAX_CUSTOM_DATES}
        >
          Add date
        </button>
        <span className="placeholder-note">{dates.length}/{MAX_CUSTOM_DATES}</span>
      </div>

      {dates.length > 0 && (
        <ul className="custom-dates-list">
          {dates.map((date) => (
            <li key={date}>
              {date}
              <button
                type="button"
                onClick={() => removeDate(date)}
                aria-label={`Remove ${date}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function RecurrenceFields({
  type,
  interval,
  daysOfWeek,
  endDate,
  weekday,
  positions,
  dates,
  onChange,
  minEndDate,
}) {
  const showInterval = type !== 'custom_dates'
  const unitLabel =
    type === 'daily' ? 'day(s)'
      : type === 'weekly' ? 'week(s)'
      : 'month(s)'

  return (
    <div className="recurrence-fields">
      <div className="task-form-row">
        <select value={type} onChange={(e) => onChange({ type: e.target.value })}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="positional_monthly">Positional monthly</option>
          <option value="custom_dates">Custom dates</option>
        </select>

        {showInterval && (
          <label className="recurrence-interval">
            every
            <input
              type="number"
              min="1"
              value={interval}
              onChange={(e) => onChange({ interval: e.target.value })}
            />
            {unitLabel}
          </label>
        )}
      </div>

      {type === 'weekly' && (
        <WeekdayToggle
          selected={daysOfWeek}
          onChange={(days) => onChange({ daysOfWeek: days })}
        />
      )}

      {type === 'positional_monthly' && (
        <div className="task-form-row">
          <select
            value={weekday}
            onChange={(e) => onChange({ weekday: Number(e.target.value) })}
          >
            {WEEKDAY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <PositionToggle
            selected={positions}
            onChange={(newPositions) => onChange({ positions: newPositions })}
          />
        </div>
      )}

      {type === 'custom_dates' && (
        <CustomDatesFields
          dates={dates}
          onChange={(newDates) => onChange({ dates: newDates })}
        />
      )}

      {type !== 'custom_dates' && (
        <label className="recurrence-end-date">
          End date (optional)
          <input
            type="date"
            value={endDate}
            min={minEndDate}
            onChange={(e) => onChange({ endDate: e.target.value })}
          />
        </label>
      )}
    </div>
  )
}
