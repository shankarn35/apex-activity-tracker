import { WEEKDAY_OPTIONS } from '../lib/recurrence'

export default function WeekdayToggle({ selected, onChange }) {
  const toggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((d) => d !== value))
    } else {
      onChange([...selected, value].sort((a, b) => a - b))
    }
  }

  return (
    <div className="weekday-toggle">
      {WEEKDAY_OPTIONS.map(({ value, label }) => (
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
