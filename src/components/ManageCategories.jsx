import { useState, useRef, useEffect } from 'react'
import { Settings } from 'lucide-react'
import {
  CATEGORY_COLORS,
  countTasksUsingCategory,
  deleteCategory,
  updateCategoryColor,
} from '../lib/categories'
import { friendlyErrorMessage } from '../lib/errors'

export default function ManageCategories({ categories, onDeleted, onRecolored }) {
  const [open, setOpen] = useState(false)
  const [recoloringId, setRecoloringId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteChecking, setDeleteChecking] = useState(false)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [error, setError] = useState('')
  const popoverRef = useRef(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false)
        setRecoloringId(null)
        setDeleteTarget(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handlePickColor = async (category, color) => {
    setError('')
    try {
      const updated = await updateCategoryColor(category.id, color)
      onRecolored(updated)
      setRecoloringId(null)
    } catch (err) {
      setError(friendlyErrorMessage(err))
    }
  }

  const openDeleteConfirm = async (category) => {
    setError('')
    setRecoloringId(null)
    setDeleteTarget({ category, taskCount: null })
    setDeleteChecking(true)
    try {
      const count = await countTasksUsingCategory(category.id)
      setDeleteTarget({ category, taskCount: count })
    } catch (err) {
      setError(friendlyErrorMessage(err))
      setDeleteTarget(null)
    } finally {
      setDeleteChecking(false)
    }
  }

  const confirmDelete = async () => {
    const { category } = deleteTarget
    setDeleteSubmitting(true)
    setError('')
    try {
      await deleteCategory(category.id)
      onDeleted(category.id)
      setDeleteTarget(null)
    } catch (err) {
      setError(friendlyErrorMessage(err))
    } finally {
      setDeleteSubmitting(false)
    }
  }

  return (
    <div className="manage-categories-control">
      <button
        type="button"
        className="completed-history-fields-toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Manage categories"
        title="Manage categories"
      >
        <Settings size={16} />
      </button>

      {open && (
        <div className="fields-menu manage-categories-menu" ref={popoverRef}>
          {categories.length === 0 ? (
            <p className="placeholder-note">No categories yet.</p>
          ) : (
            <ul className="manage-categories-list">
              {categories.map((category) => (
                <li key={category.id} className="manage-categories-row">
                  <div className="manage-categories-row-main">
                    <button
                      type="button"
                      className="category-color-swatch"
                      style={{ backgroundColor: category.color }}
                      onClick={() =>
                        setRecoloringId((prev) => (prev === category.id ? null : category.id))
                      }
                      aria-label={`Change color for ${category.name}`}
                    />
                    <span className="manage-categories-name">{category.name}</span>
                    <button
                      type="button"
                      className="task-item-undo-button"
                      onClick={() => openDeleteConfirm(category)}
                    >
                      Delete
                    </button>
                  </div>

                  {recoloringId === category.id && (
                    <div className="category-color-options">
                      {CATEGORY_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className="category-color-swatch"
                          style={{ backgroundColor: color }}
                          onClick={() => handlePickColor(category, color)}
                          aria-label={`Set color ${color}`}
                        />
                      ))}
                    </div>
                  )}

                  {deleteTarget?.category.id === category.id && (
                    <div className="manage-categories-delete-confirm">
                      {deleteChecking ? (
                        <p className="placeholder-note">Checking...</p>
                      ) : (
                        <>
                          <p className="undo-popover-message">
                            {deleteTarget.taskCount > 0
                              ? `${deleteTarget.taskCount} task${deleteTarget.taskCount === 1 ? '' : 's'} use this category — remove it from them?`
                              : 'No tasks use this category — delete it?'}
                          </p>
                          <div className="complete-popover-actions">
                            <button
                              type="button"
                              className="modal-secondary-button"
                              onClick={() => setDeleteTarget(null)}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={confirmDelete}
                              disabled={deleteSubmitting}
                            >
                              {deleteSubmitting ? 'Deleting...' : 'Confirm'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {error && <p className="task-form-message">{error}</p>}
        </div>
      )}
    </div>
  )
}
