import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { advanceDate, today } from '../lib/recurrence'
import { fetchOccurrenceDates } from '../lib/occurrences'
import { fetchCategories } from '../lib/categories'
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

const SHOW_PRIORITY_STORAGE_KEY = 'showPriority'
const SHOW_CATEGORY_STORAGE_KEY = 'showCategory'

function readStoredShowPriority() {
  const stored = localStorage.getItem(SHOW_PRIORITY_STORAGE_KEY)
  return stored === null ? true : stored === 'true'
}

function readStoredShowCategory() {
  const stored = localStorage.getItem(SHOW_CATEGORY_STORAGE_KEY)
  return stored === null ? true : stored === 'true'
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
  const [showPriority, setShowPriority] = useState(readStoredShowPriority)
  const [showCategory, setShowCategory] = useState(readStoredShowCategory)
  const [lastCompletedItem, setLastCompletedItem] = useState(null)
  const [categories, setCategories] = useState([])

  const toggleShowPriority = () => {
    setShowPriority((prev) => {
      const next = !prev
      localStorage.setItem(SHOW_PRIORITY_STORAGE_KEY, String(next))
      return next
    })
  }

  const toggleShowCategory = () => {
    setShowCategory((prev) => {
      const next = !prev
      localStorage.setItem(SHOW_CATEGORY_STORAGE_KEY, String(next))
      return next
    })
  }

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

  useEffect(() => {
    let cancelled = false

    fetchCategories(session.user.id)
      .then((data) => {
        if (!cancelled) setCategories(data)
      })
      .catch((err) => {
        if (!cancelled) setError(friendlyErrorMessage(err))
      })

    return () => {
      cancelled = true
    }
  }, [session.user.id])

  const handleCategoryCreated = (category) => {
    setCategories((prev) => [...prev, category])
  }

  const handleCategoryDeleted = (categoryId) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId))
  }

  const handleCategoryRecolored = (updatedCategory) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === updatedCategory.id ? updatedCategory : c))
    )
  }

  const handleCreated = (task) => {
    setTasks((prev) => sortByDueDate([...prev, task]))
  }

  const handleComplete = async (task, completedOnDate) => {
    setError('')
    const completedAt = new Date(`${completedOnDate}T12:00:00`).toISOString()

    try {
      if (!task.is_recurring) {
        const { data, error } = await supabase
          .from('tasks')
          .update({ completed: true, completed_at: completedAt })
          .eq('id', task.id)
          .select()
          .single()

        if (error) throw error

        setTasks((prev) => prev.filter((t) => t.id !== task.id))
        setLastCompletedItem(data)
        return
      }

      const { data: occurrence, error: occurrenceError } = await supabase
        .from('tasks')
        .insert({
          user_id: task.user_id,
          parent_task_id: task.id,
          occurrence_date: task.due_date,
          title: task.title,
          priority: task.priority,
          category_id: task.category_id,
          completed: true,
          completed_at: completedAt,
          is_recurring: false,
        })
        .select()
        .single()

      if (occurrenceError) throw occurrenceError

      setLastCompletedItem(occurrence)

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

  const handleUncomplete = (restoredTask) => {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === restoredTask.id)
      const next = exists
        ? prev.map((t) => (t.id === restoredTask.id ? restoredTask : t))
        : [...prev, restoredTask]
      return sortByDueDate(next)
    })
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
      <div className="tasks-page-header">
        <h2>Tasks</h2>
      </div>

      <TaskForm
        userId={session.user.id}
        onCreated={handleCreated}
        categories={categories}
        onCategoryCreated={handleCategoryCreated}
        onCategoryDeleted={handleCategoryDeleted}
        onCategoryRecolored={handleCategoryRecolored}
      />

      {error && <p className="task-form-message">{error}</p>}

      <div className="tasks-page-toggles">
        <label className="show-priority-toggle">
          <input
            type="checkbox"
            checked={showPriority}
            onChange={toggleShowPriority}
          />
          Show priority
        </label>
        <label className="show-priority-toggle">
          <input
            type="checkbox"
            checked={showCategory}
            onChange={toggleShowCategory}
          />
          Show category
        </label>
      </div>

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
              showPriority={showPriority}
              showCategory={showCategory}
              categories={categories}
            />
          ))}
        </ul>
      )}

      <CompletedHistory
        userId={session.user.id}
        showPriority={showPriority}
        onToggleShowPriority={toggleShowPriority}
        showCategory={showCategory}
        onToggleShowCategory={toggleShowCategory}
        onUncomplete={handleUncomplete}
        newlyCompletedItem={lastCompletedItem}
        categories={categories}
      />

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
