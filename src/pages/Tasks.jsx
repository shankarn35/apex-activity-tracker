import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { advanceDate, today } from '../lib/recurrence'
import { fetchOccurrenceDates } from '../lib/occurrences'
import { friendlyErrorMessage } from '../lib/errors'
import TaskForm from '../components/TaskForm'
import TaskItem from '../components/TaskItem'
import EditRecurrenceModal from '../components/EditRecurrenceModal'
import EndDatePrompt from '../components/EndDatePrompt'
import CompletedHistory from '../components/CompletedHistory'

function sortByDueDate(tasks) {
  return [...tasks].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date.localeCompare(b.due_date)
  })
}

function findEndDatePassedTasks(tasks) {
  const todayStr = today()
  return tasks.filter(
    (t) =>
      t.is_recurring &&
      t.recurrence_active &&
      t.recurrence_rule?.end_date &&
      t.recurrence_rule.end_date < todayStr
  )
}

export default function Tasks({ session }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingTask, setEditingTask] = useState(null)
  const [pendingEndDateTasks, setPendingEndDateTasks] = useState([])
  const [endDatePromptMode, setEndDatePromptMode] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadTasks() {
      setLoading(true)
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', session.user.id)
        .is('parent_task_id', null)
        .eq('recurrence_active', true)
        .eq('completed', false)

      if (cancelled) return

      if (error) {
        setError(friendlyErrorMessage(error))
      } else {
        const sorted = sortByDueDate(data)
        setTasks(sorted)

        const needsResolution = findEndDatePassedTasks(sorted)
        setPendingEndDateTasks(needsResolution)
        if (needsResolution.length === 1) {
          setEndDatePromptMode('sequential')
        } else if (needsResolution.length > 1) {
          setEndDatePromptMode('choice')
        }
      }
      setLoading(false)
    }

    loadTasks()
    return () => {
      cancelled = true
    }
  }, [session.user.id])

  const handleCreated = (task) => {
    setTasks((prev) => sortByDueDate([...prev, task]))
  }

  const handleComplete = async (task, completedOnDate) => {
    setError('')
    const completedAt = new Date(`${completedOnDate}T12:00:00`).toISOString()

    try {
      if (!task.is_recurring) {
        const { error } = await supabase
          .from('tasks')
          .update({ completed: true, completed_at: completedAt })
          .eq('id', task.id)

        if (error) throw error

        setTasks((prev) => prev.filter((t) => t.id !== task.id))
        return
      }

      const { error: occurrenceError } = await supabase.from('tasks').insert({
        user_id: task.user_id,
        parent_task_id: task.id,
        occurrence_date: task.due_date,
        title: task.title,
        priority: task.priority,
        completed: true,
        completed_at: completedAt,
        is_recurring: false,
      })

      if (occurrenceError) throw occurrenceError

      const excludedDates = await fetchOccurrenceDates(task.id)
      const nextDueDate = advanceDate(
        task.due_date,
        task.recurrence_rule,
        task.recurrence_start_date,
        excludedDates
      )

      const { data: updatedTemplate, error: templateError } = await supabase
        .from('tasks')
        .update({
          due_date: nextDueDate,
          recurrence_active: nextDueDate !== null,
        })
        .eq('id', task.id)
        .select()
        .single()

      if (templateError) throw templateError

      setTasks((prev) => {
        const next = nextDueDate === null
          ? prev.filter((t) => t.id !== task.id)
          : prev.map((t) => (t.id === task.id ? updatedTemplate : t))
        return sortByDueDate(next)
      })
    } catch (err) {
      setError(friendlyErrorMessage(err))
    }
  }

  const handleRecurrenceSaved = (updatedTask) => {
    setTasks((prev) => {
      const next = updatedTask.recurrence_active
        ? prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
        : prev.filter((t) => t.id !== updatedTask.id)
      return sortByDueDate(next)
    })
    setEditingTask(null)
  }

  const handleEndDateResolve = async (task, action, payload) => {
    let updates

    if (action === 'continue') {
      // eslint-disable-next-line no-unused-vars
      const { end_date, ...rest } = task.recurrence_rule
      updates = { recurrence_rule: rest }
    } else if (action === 'newEndDate') {
      updates = { recurrence_rule: { ...task.recurrence_rule, end_date: payload } }
    } else if (action === 'stop') {
      updates = { recurrence_active: false }
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', task.id)
        .select()
        .single()

      if (error) throw error

      setTasks((prev) => {
        const next = data.recurrence_active
          ? prev.map((t) => (t.id === data.id ? data : t))
          : prev.filter((t) => t.id !== data.id)
        return sortByDueDate(next)
      })

      setPendingEndDateTasks((prev) => {
        const remaining = prev.filter((t) => t.id !== task.id)
        if (remaining.length === 0) setEndDatePromptMode(null)
        return remaining
      })
    } catch (err) {
      setError(friendlyErrorMessage(err))
    }
  }

  return (
    <div className="page-placeholder tasks-page">
      <h2>Tasks</h2>

      <TaskForm userId={session.user.id} onCreated={handleCreated} />

      {error && <p className="task-form-message">{error}</p>}

      {loading ? (
        <p className="placeholder-note">Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p className="placeholder-note">No tasks yet — add one above.</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onComplete={handleComplete}
              onEditRecurrence={setEditingTask}
            />
          ))}
        </ul>
      )}

      <CompletedHistory userId={session.user.id} />

      {editingTask && (
        <EditRecurrenceModal
          task={editingTask}
          onSaved={handleRecurrenceSaved}
          onClose={() => setEditingTask(null)}
        />
      )}

      {endDatePromptMode && (
        <EndDatePrompt
          mode={endDatePromptMode}
          pendingTasks={pendingEndDateTasks}
          onChooseMode={setEndDatePromptMode}
          onResolve={handleEndDateResolve}
          onClose={() => setEndDatePromptMode(null)}
        />
      )}
    </div>
  )
}
