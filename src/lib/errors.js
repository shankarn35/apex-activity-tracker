// Maps a Supabase/Postgres error to plain, user-facing text — raw
// constraint/violation messages should never reach the screen.
export function friendlyErrorMessage(error) {
  if (!error) return ''

  const detail = `${error.message ?? ''} ${error.details ?? ''}`

  if (error.code === '23505' && detail.includes('unique_occurrence_per_template')) {
    return 'This date already has a completed entry for this task — pick a different date.'
  }
  if (error.code === '23505') {
    return 'That change conflicts with an existing record. Please try a different value.'
  }
  if (error.code === '23514') {
    return "That value isn't allowed. Please check your input and try again."
  }
  if (error.code === '23503') {
    return 'That record no longer exists. Please refresh and try again.'
  }

  return 'Something went wrong saving your changes. Please try again.'
}
