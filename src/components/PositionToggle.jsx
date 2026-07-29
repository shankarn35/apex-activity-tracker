import { POSITION_OPTIONS, sortPositions } from '../lib/recurrence'

export default function PositionToggle({ selected, onChange }) {
  const toggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((p) => p !== value))
    } else {
      onChange(sortPositions([...selected, value]))
    }
  }

  return (
    <div className="weekday-toggle">
      {POSITION_OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={`weekday-button${selected.includes(value) ? ' selected' : ''}`}
          onClick={() => toggle(value)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
