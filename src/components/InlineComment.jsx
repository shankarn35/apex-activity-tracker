import { useState, useRef } from 'react'

// Click-to-edit comment text, shared by the Active list and Completed
// History. Handles both adding a comment where none exists and editing an
// existing one — same flow either way. Saves on blur or Enter (Shift+Enter
// for a newline); Escape cancels without saving.
export default function InlineComment({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef(null)
  const skipNextBlurSave = useRef(false)

  const startEditing = () => {
    setDraft(value ?? '')
    setError('')
    setEditing(true)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const cancel = () => {
    skipNextBlurSave.current = true
    setEditing(false)
    setError('')
  }

  const save = async () => {
    const trimmed = draft.trim()
    const newValue = trimmed === '' ? null : trimmed

    if (newValue === (value ?? null)) {
      setEditing(false)
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave(newValue)
      setEditing(false)
    } catch (err) {
      setError(err.message || 'Failed to save comment.')
    } finally {
      setSaving(false)
    }
  }

  const handleBlur = () => {
    if (skipNextBlurSave.current) {
      skipNextBlurSave.current = false
      return
    }
    save()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      textareaRef.current?.blur()
    } else if (e.key === 'Escape') {
      cancel()
    }
  }

  if (editing) {
    return (
      <div className="inline-comment inline-comment-editing">
        <textarea
          ref={textareaRef}
          className="inline-comment-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          rows={2}
          disabled={saving}
        />
        {error && <p className="inline-comment-error">{error}</p>}
      </div>
    )
  }

  return (
    <div className="inline-comment">
      <button
        type="button"
        className={`inline-comment-display${value ? '' : ' inline-comment-placeholder'}`}
        onClick={startEditing}
      >
        {value || '+ Add comment'}
      </button>
    </div>
  )
}
