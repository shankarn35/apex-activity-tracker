import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  format,
  isAfter,
  isBefore,
} from 'date-fns'

const MAX_WEEKLY_SEARCH_DAYS = 400
const MAX_MONTHLY_SEARCH_STEPS = 120

const WEEKDAY_LABELS = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' }
const POSITION_LABELS = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', '-1': 'last' }

export const WEEKDAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7].map((value) => ({
  value,
  label: WEEKDAY_LABELS[value],
}))

export const POSITION_OPTIONS = [
  { value: '1', label: '1st' },
  { value: '2', label: '2nd' },
  { value: '3', label: '3rd' },
  { value: '4', label: '4th' },
  { value: '-1', label: 'Last' },
]

export function sortPositions(positions) {
  return [...positions].sort((a, b) => {
    if (a === '-1') return 1
    if (b === '-1') return -1
    return Number(a) - Number(b)
  })
}

function parseDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`)
}

function toDateStr(date) {
  return format(date, 'yyyy-MM-dd')
}

export function today() {
  return toDateStr(new Date())
}

// ISO weekday: 1 = Monday ... 7 = Sunday
function isoWeekday(date) {
  const day = date.getDay()
  return day === 0 ? 7 : day
}

// Smallest date >= target that is `start + k * intervalDays` for some k >= 0.
function nextByDayStep(target, start, intervalDays) {
  const diffDays = differenceInCalendarDays(target, start)
  if (diffDays <= 0) return start
  const steps = Math.ceil(diffDays / intervalDays)
  return addDays(start, steps * intervalDays)
}

function nextMonthly(target, start, interval) {
  const diffMonths = differenceInCalendarMonths(target, start)
  if (diffMonths <= 0) return start
  const steps = Math.ceil(diffMonths / interval)
  let candidate = addMonths(start, steps * interval)
  // differenceInCalendarMonths + day-of-month clamping can occasionally land
  // one step short; nudge forward until it actually reaches the target.
  while (isBefore(candidate, target)) {
    candidate = addMonths(candidate, interval)
  }
  return candidate
}

function nextWeeklyByDays(target, start, interval, daysOfWeek) {
  let candidate = isAfter(start, target) ? start : target

  for (let i = 0; i < MAX_WEEKLY_SEARCH_DAYS; i++) {
    if (daysOfWeek.includes(isoWeekday(candidate))) {
      const weekIndex = differenceInCalendarWeeks(candidate, start, { weekStartsOn: 1 })
      if (weekIndex >= 0 && weekIndex % interval === 0) {
        return candidate
      }
    }
    candidate = addDays(candidate, 1)
  }

  return null
}

function startOfMonthDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

// All dates in `monthDate`'s month matching any of the requested
// weekday+position combinations, sorted ascending.
function positionalMonthlyDatesInMonth(monthDate, weekday, positions) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const results = []

  for (const pos of positions) {
    if (pos === '-1') {
      const lastDayOfMonth = new Date(year, month + 1, 0)
      const diff = (isoWeekday(lastDayOfMonth) - weekday + 7) % 7
      results.push(new Date(year, month, lastDayOfMonth.getDate() - diff))
    } else {
      const n = Number(pos)
      const firstOfMonth = new Date(year, month, 1)
      const diff = (weekday - isoWeekday(firstOfMonth) + 7) % 7
      const day = 1 + diff + (n - 1) * 7
      const candidate = new Date(year, month, day)
      if (candidate.getMonth() === month) {
        results.push(candidate)
      }
    }
  }

  return results.sort((a, b) => a - b)
}

function nextPositionalMonthly(target, start, interval, weekday, positions) {
  const baseMonth = startOfMonthDate(start)
  const monthsAhead = differenceInCalendarMonths(target, baseMonth)
  let k = monthsAhead > 0 ? Math.max(0, Math.floor(monthsAhead / interval) - 1) : 0

  for (let i = 0; i < MAX_MONTHLY_SEARCH_STEPS; i++) {
    const monthDate = addMonths(baseMonth, k * interval)
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)

    if (!isBefore(monthEnd, target)) {
      const candidates = positionalMonthlyDatesInMonth(monthDate, weekday, positions).filter(
        (d) => !isBefore(d, target)
      )
      if (candidates.length > 0) return candidates[0]
    }

    k += 1
  }

  return null
}

function nextCustomDate(target, dates) {
  const sorted = dates.map(parseDate).sort((a, b) => a - b)
  return sorted.find((d) => !isBefore(d, target)) ?? null
}

// Finds the first valid occurrence on or after `targetDateStr` under `rule`,
// anchored to `recurrenceStartDateStr`. Returns null if that would fall
// after rule.end_date (the series has run out), or — for custom_dates — if
// no listed date remains on/after the target.
export function nextOccurrenceOnOrAfter(targetDateStr, rule, recurrenceStartDateStr) {
  const target = parseDate(targetDateStr)
  const start = parseDate(recurrenceStartDateStr)
  const interval = rule.interval ?? 1

  let candidate
  if (rule.type === 'daily') {
    candidate = nextByDayStep(target, start, interval)
  } else if (rule.type === 'monthly') {
    candidate = nextMonthly(target, start, interval)
  } else if (rule.type === 'weekly' && rule.days_of_week?.length) {
    candidate = nextWeeklyByDays(target, start, interval, rule.days_of_week)
  } else if (rule.type === 'weekly') {
    candidate = nextByDayStep(target, start, interval * 7)
  } else if (rule.type === 'positional_monthly') {
    candidate = nextPositionalMonthly(target, start, interval, rule.weekday, rule.positions)
  } else if (rule.type === 'custom_dates') {
    candidate = nextCustomDate(target, rule.dates)
  } else {
    throw new Error(`Unknown recurrence type: ${rule.type}`)
  }

  if (!candidate) return null
  if (rule.end_date && isAfter(candidate, parseDate(rule.end_date))) return null

  return toDateStr(candidate)
}

const MAX_COLLISION_SKIPS = 200

// Like nextOccurrenceOnOrAfter, but skips any candidate date already present
// in `excludedDates` (dates that already have a completed occurrence row for
// this template) — keeps a recomputed due_date from colliding with history.
function nextAvailableOccurrence(fromDateStr, rule, recurrenceStartDateStr, excludedDates) {
  let searchFrom = fromDateStr

  for (let i = 0; i < MAX_COLLISION_SKIPS; i++) {
    const candidate = nextOccurrenceOnOrAfter(searchFrom, rule, recurrenceStartDateStr)
    if (candidate === null) return null
    if (!excludedDates.has(candidate)) return candidate
    searchFrom = toDateStr(addDays(parseDate(candidate), 1))
  }

  return null
}

// Next occurrence strictly after a just-completed one. `excludedDates`
// (already-completed occurrence dates for this template) are skipped over.
export function advanceDate(currentDateStr, rule, recurrenceStartDateStr, excludedDates = new Set()) {
  const dayAfter = toDateStr(addDays(parseDate(currentDateStr), 1))
  return nextAvailableOccurrence(dayAfter, rule, recurrenceStartDateStr, excludedDates)
}

// Recomputes a template's { due_date, recurrence_active } from a given date
// (defaults to today) under `rule` — used both when completing an
// occurrence and when the user edits a template's recurrence rule.
// `excludedDates` are already-completed occurrence dates for this template,
// which must never be reassigned as the template's next due_date.
export function nextTemplateSchedule(rule, recurrenceStartDateStr, fromDateStr = today(), excludedDates = new Set()) {
  const nextDate = nextAvailableOccurrence(fromDateStr, rule, recurrenceStartDateStr, excludedDates)
  return {
    due_date: nextDate,
    recurrence_active: nextDate !== null,
  }
}

export function formatRuleSummary(rule) {
  if (!rule) return ''

  const {
    type,
    interval = 1,
    days_of_week: daysOfWeek,
    end_date: endDate,
    weekday,
    positions,
    dates,
  } = rule
  let base

  if (type === 'weekly' && daysOfWeek?.length) {
    const days = daysOfWeek
      .slice()
      .sort((a, b) => a - b)
      .map((d) => WEEKDAY_LABELS[d])
      .join('/')
    base = interval > 1 ? `every ${interval} weeks on ${days}` : days
  } else if (type === 'positional_monthly') {
    const positionLabel = sortPositions(positions).map((p) => POSITION_LABELS[p]).join(' and ')
    const weekdayLabel = WEEKDAY_LABELS[weekday]
    base = interval > 1
      ? `every ${interval} months, ${positionLabel} ${weekdayLabel}`
      : `${positionLabel} ${weekdayLabel} of the month`
  } else if (type === 'custom_dates') {
    const sortedDates = [...dates].sort()
    const displayDates = sortedDates.slice(0, 2).map((d) => format(parseDate(d), 'MMM d'))
    base = sortedDates.length > 2
      ? `${displayDates.join(', ')} +${sortedDates.length - 2} more`
      : displayDates.join(', ')
  } else {
    const unit = type === 'daily' ? 'day' : type === 'weekly' ? 'week' : 'month'
    base = interval > 1 ? `every ${interval} ${unit}s` : `every ${unit}`
  }

  if (endDate) {
    base += ` · ends ${format(parseDate(endDate), 'MMM d, yyyy')}`
  }

  return base
}
